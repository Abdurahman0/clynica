import { useMemo, useState, type FormEvent } from 'react';
import { FiArrowRight, FiEye, FiEyeOff, FiLock, FiUser } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  canAccessRouteForUser,
  resolveDefaultLandingPathForUser,
  useAuth,
} from '../../../auth';
import { getRouteByPathname } from '../../../config/routes';

interface LoginLocationState {
  from?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readMessage(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractLoginErrorMessage(error: unknown, fallback: string): string {
  const topLevel = asRecord(error);
  const response = asRecord(topLevel?.response);
  const data = response?.data;
  const dataRecord = asRecord(data);

  const candidates: Array<unknown> = [
    dataRecord?.detail,
    dataRecord?.message,
    dataRecord?.error,
    Array.isArray(dataRecord?.non_field_errors)
      ? (dataRecord?.non_field_errors as unknown[])[0]
      : null,
    Array.isArray(dataRecord?.errors)
      ? (dataRecord?.errors as unknown[])[0]
      : null,
    Array.isArray(data)
      ? (data as unknown[])[0]
      : null,
    topLevel?.message,
  ];

  for (const candidate of candidates) {
    const message = readMessage(candidate);
    if (message) {
      return message;
    }
  }

  return fallback;
}

function isValidUsername(value: string): boolean {
  return value.trim().length > 0;
}

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const redirectFromPath = useMemo(() => {
    const state = location.state as LoginLocationState | null;
    return state?.from;
  }, [location.state]);

  const trimmedUsername = username.trim();
  const usernameHasError = username.length > 0 && !isValidUsername(trimmedUsername);
  const passwordHasError = password.length > 0 && password.length < 8;
  const isFormValid =
    trimmedUsername.length > 0 &&
    password.length >= 8 &&
    isValidUsername(trimmedUsername);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isFormValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const user = await login({ username: trimmedUsername, password });
      
      const targetRoute = redirectFromPath
        ? getRouteByPathname(redirectFromPath)
        : undefined;
      const nextPath =
        targetRoute && canAccessRouteForUser(user, targetRoute.id)
          ? targetRoute.path
          : resolveDefaultLandingPathForUser(user);
      
      // Give auth state time to propagate before navigating
      await new Promise(resolve => setTimeout(resolve, 100));
      
      navigate(nextPath, { replace: true });
    } catch (error) {
      setErrorMessage(
        extractLoginErrorMessage(error, t('auth.login.invalidCredentials')),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6"
      style={{
        background:
          'radial-gradient(130% 120% at 0% 0%, #e8f5e9 0%, #f1f8f5 48%, #ebf5f0 100%)',
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-24 -left-16 h-72 w-72 rounded-full blur-3xl"
          style={{ background: 'rgba(34, 139, 34, 0.13)' }}
        />
        <div
          className="absolute -bottom-24 -right-20 h-80 w-80 rounded-full blur-3xl"
          style={{ background: 'rgba(60, 179, 113, 0.11)' }}
        />
        <div
          className="absolute left-1/2 top-[14%] h-52 w-52 -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: 'rgba(34, 139, 34, 0.11)' }}
        />
      </div>

      <section className="relative z-10 w-full" style={{ maxWidth: '430px' }}>
        <article
          className="rounded-[24px] p-6 sm:p-8"
          style={{
            backgroundColor: '#ffffff',
            boxShadow:
              '0 34px 72px -40px rgba(34, 139, 34, 0.52), 0 14px 24px -22px rgba(15, 23, 42, 0.26)',
            border: '1px solid rgba(144, 238, 144, 0.4)',
          }}
        >
          <div className="text-center">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.24em]"
              style={{ color: '#2d6b2d' }}
            >
              {t('auth.login.eyebrow')}
            </p>
            <h1
              className="mt-2 text-[2.2rem] font-extrabold leading-none tracking-[-0.038em]"
              style={{ color: '#228b22' }}
            >
              Renaissance Clinic
            </h1>
            <p className="mt-3 text-[0.98rem] leading-relaxed" style={{ color: '#67768e' }}>
              {t('auth.login.subtitle')}
            </p>
          </div>

          <form className="mt-7 grid gap-4" onSubmit={handleSubmit} noValidate>
            <label className="grid gap-2">
              <span
                className="text-[12px] font-semibold tracking-[0.01em]"
                style={{ color: '#334155' }}
              >
                {t('auth.login.usernameLabel')}
              </span>
              <span
                className="relative flex h-[52px] items-center rounded-[14px] border transition duration-fast focus-within:ring-4"
                style={{
                  backgroundColor: '#f8fdf8',
                  borderColor: usernameHasError ? '#ef4444' : '#b3e5b3',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95)',
                  ['--tw-ring-color' as string]: 'rgba(60, 179, 113, 0.28)',
                }}
              >
                <FiUser className="ml-4 h-[18px] w-[18px] shrink-0" style={{ color: '#4a8f4a' }} />
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  required
                  aria-invalid={usernameHasError}
                  aria-describedby={usernameHasError ? 'login-username-error' : undefined}
                  placeholder={t('auth.login.usernamePlaceholder')}
                  className="h-full w-full rounded-[14px] border-0 bg-transparent px-3.5 pr-3.5 text-[15px] font-medium placeholder:text-[14px] placeholder:text-slate-400 focus:outline-none"
                  style={{ color: '#0f172a', caretColor: '#155015' }}
                />
              </span>
              {usernameHasError ? (
                <span
                  id="login-username-error"
                  className="text-xs font-medium"
                  style={{ color: '#dc2626' }}
                >
                  {t('auth.login.usernameError')}
                </span>
              ) : null}
            </label>

            <label className="grid gap-2">
              <span
                className="text-[12px] font-semibold tracking-[0.01em]"
                style={{ color: '#334155' }}
              >
                {t('auth.login.passwordLabel')}
              </span>
              <span
                className="relative flex h-[52px] items-center rounded-[14px] border transition duration-fast focus-within:ring-4"
                style={{
                  backgroundColor: '#f8fdf8',
                  borderColor: passwordHasError ? '#ef4444' : '#b3e5b3',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95)',
                  ['--tw-ring-color' as string]: 'rgba(60, 179, 113, 0.28)',
                }}
              >
                <FiLock className="ml-4 h-[18px] w-[18px] shrink-0" style={{ color: '#4a8f4a' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  minLength={8}
                  aria-invalid={passwordHasError}
                  aria-describedby={passwordHasError ? 'login-password-error' : undefined}
                  className="h-full w-full rounded-[14px] border-0 bg-transparent px-3.5 pr-12 text-[15px] font-medium placeholder:text-[14px] placeholder:text-slate-400 focus:outline-none"
                  style={{ color: '#0f172a', caretColor: '#155015' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2.5 inline-flex h-8 w-8 items-center justify-center rounded-lg transition duration-fast hover:bg-slate-100"
                  aria-label={
                    showPassword
                      ? t('auth.login.hidePassword')
                      : t('auth.login.showPassword')
                  }
                  style={{ color: '#6b7e9f' }}
                >
                  {showPassword ? (
                    <FiEyeOff className="h-4 w-4" />
                  ) : (
                    <FiEye className="h-4 w-4" />
                  )}
                </button>
              </span>
              {passwordHasError ? (
                <span
                  id="login-password-error"
                  className="text-xs font-medium"
                  style={{ color: '#dc2626' }}
                >
                  {t('auth.login.passwordError')}
                </span>
              ) : null}
            </label>

            {errorMessage ? (
              <p
                role="alert"
                className="rounded-lg px-3 py-2 text-sm font-medium"
                style={{ color: '#b91c1c', backgroundColor: '#fee2e2' }}
              >
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className="mt-2 inline-flex h-[52px] items-center justify-center gap-2 rounded-[14px] px-4 text-[1.02rem] font-semibold text-white transition duration-fast hover:-translate-y-px hover:brightness-105 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: 'linear-gradient(102deg, #228b22 0%, #1e7b1e 54%, #155015 100%)',
                boxShadow: '0 18px 34px -20px rgba(34, 139, 34, 0.78)',
              }}
            >
              <FiArrowRight className="h-4 w-4" />
              {isSubmitting ? t('auth.login.signingIn') : t('auth.login.signIn')}
            </button>
          </form>
        </article>

        <footer className="mt-6 text-center text-[11px] leading-relaxed" style={{ color: '#6b7280' }}>
          <p>{t('auth.login.footerRights')}</p>
          <p className="mt-1.5">
            {t('auth.login.footerPowered')}{' '}
            <a
              href="https://www.cognilabs.org"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#155015', fontWeight: 700 }}
            >
              Cognilabs
            </a>
          </p>
        </footer>
      </section>
    </main>
  );
}

export default LoginPage;
