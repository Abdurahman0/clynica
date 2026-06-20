import axios, {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
  type AxiosResponseHeaders,
  type RawAxiosResponseHeaders,
} from 'axios';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './auth-storage';
import type { AuthTokens } from './auth-storage';

declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
    _skipAuthRefresh?: boolean;
  }
}

const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
const useApiProxy =
  import.meta.env.DEV &&
  configuredBaseUrl.length > 0 &&
  import.meta.env.VITE_API_USE_PROXY !== 'false';
const API_BASE_URL = useApiProxy ? '' : configuredBaseUrl;
const NGROK_BYPASS_HEADER_NAME = 'ngrok-skip-browser-warning';

function isNgrokHost(baseUrl: string): boolean {
  if (!baseUrl) {
    return false;
  }

  try {
    const hostname = new URL(baseUrl).hostname.toLowerCase();
    return (
      hostname.endsWith('.ngrok-free.dev') ||
      hostname.endsWith('.ngrok-free.app') ||
      hostname.endsWith('.ngrok.io')
    );
  } catch {
    return false;
  }
}

const shouldAttachNgrokBypassHeader = isNgrokHost(API_BASE_URL);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

let authFailureHandler: (() => void) | null = null;
let refreshRequestPromise: Promise<AuthTokens | null> | null = null;

function applyCommonRequestHeaders(
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig {
  config.headers = config.headers ?? {};
  
  // Only set default Accept if not already specified
  if (!config.headers.Accept) {
    config.headers.Accept = 'application/json';
  }

  if (shouldAttachNgrokBypassHeader) {
    config.headers[NGROK_BYPASS_HEADER_NAME] = 'true';
  }

  return config;
}

function isNgrokInterstitialResponse(
  headers?: AxiosResponseHeaders | RawAxiosResponseHeaders,
): boolean {
  if (!headers) {
    return false;
  }

  const contentType = String(headers['content-type'] ?? '').toLowerCase();
  const ngrokErrorCode = String(headers['ngrok-error-code'] ?? '').toUpperCase();

  return contentType.includes('text/html') && ngrokErrorCode.startsWith('ERR_NGROK_');
}

export function setAuthFailureHandler(handler: (() => void) | null): void {
  authFailureHandler = handler;
}

function notifyAuthFailure(): void {
  authFailureHandler?.();
}

export function handleUnauthorizedResponse(): void {
  clearTokens();
  notifyAuthFailure();
}

export async function requestTokenRefresh(): Promise<AuthTokens | null> {
  if (refreshRequestPromise) {
    return refreshRequestPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  refreshRequestPromise = (async () => {
    try {
      const response = await apiClient.post<any>(
        '/api/auth/refresh/',
        { refresh: refreshToken },
        { _retry: true, _skipAuthRefresh: true },
      );

      const responseData = response.data?.data ?? response.data;
      if (typeof responseData?.access !== 'string' || responseData.access.length === 0) {
        return null;
      }

      const nextTokens: AuthTokens = {
        access: responseData.access,
        refresh:
          typeof responseData?.refresh === 'string' && responseData.refresh.length > 0
            ? responseData.refresh
            : refreshToken,
      };

      setTokens(nextTokens);
      return nextTokens;
    } catch {
      return null;
    } finally {
      refreshRequestPromise = null;
    }
  })();

  return refreshRequestPromise;
}

apiClient.interceptors.request.use((config) => {
  const nextConfig = applyCommonRequestHeaders(config);
  const token = getAccessToken();

  if (token) {
    nextConfig.headers = nextConfig.headers ?? {};
    nextConfig.headers.Authorization = `Bearer ${token}`;
  }

  return nextConfig;
});

apiClient.interceptors.response.use(
  (response) => {
    if (isNgrokInterstitialResponse(response.headers)) {
      return Promise.reject(
        new Error('Ngrok interstitial page returned instead of JSON API response.'),
      );
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalConfig = error.config;
    const statusCode = error.response?.status;

    if (
      statusCode !== 401 ||
      !originalConfig ||
      originalConfig._retry ||
      originalConfig._skipAuthRefresh
    ) {
      return Promise.reject(error);
    }

    originalConfig._retry = true;

    const refreshedTokens = await requestTokenRefresh();
    if (!refreshedTokens?.access) {
      handleUnauthorizedResponse();
      return Promise.reject(error);
    }

    const nextHeaders =
      originalConfig.headers instanceof AxiosHeaders
        ? originalConfig.headers
        : AxiosHeaders.from(originalConfig.headers ?? {});

    nextHeaders.set('Authorization', `Bearer ${refreshedTokens.access}`);
    originalConfig.headers = nextHeaders;

    return apiClient(originalConfig);
  },
);
