import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { FiArrowRight, FiEye, FiEyeOff, FiLock, FiUser } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  canAccessRouteForUser,
  resolveDefaultLandingPathForUser,
  useAuth,
} from '../../../auth';
import { getRouteByPathname } from '../../../config/routes';
import {
  applyDesignVariant,
  getStoredDesignVariant,
  persistDesignVariant,
  type DesignVariant,
} from '../../../lib/design-system';

interface LoginLocationState {
  from?: string;
}

interface LoginDesignOption {
  id: DesignVariant;
  title: string;
  description: string;
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
  const [selectedDesign, setSelectedDesign] = useState<DesignVariant>(getStoredDesignVariant);

  useEffect(() => {
    applyDesignVariant(selectedDesign);
    persistDesignVariant(selectedDesign);
  }, [selectedDesign]);

  const redirectFromPath = useMemo(() => {
    const state = location.state as LoginLocationState | null;
    return state?.from;
  }, [location.state]);

  const designOptions = useMemo<LoginDesignOption[]>(
    () => [
      {
        id: 'classic',
        title: t('auth.login.designOptions.classic.title'),
        description: t('auth.login.designOptions.classic.description'),
      },
      {
        id: 'nova',
        title: t('auth.login.designOptions.nova.title'),
        description: t('auth.login.designOptions.nova.description'),
      },
    ],
    [t],
  );

  const isNovaDesign = selectedDesign === 'nova';

  const designStyles = useMemo(() => {
    if (isNovaDesign) {
      return {
        pageBackground:
          'linear-gradient(150deg, #0b1020, #131a2e 60%, #0e1424)',
        orbOne: 'rgba(99, 102, 241, 0.32)',
        orbTwo: 'rgba(244, 114, 182, 0.18)',
        orbThree: 'rgba(34, 211, 238, 0.15)',
        cardBackground: '#0a0e17',
        cardBorder: '1px solid rgba(35, 44, 64, 0.95)',
        cardShadow:
          '0 24px 60px rgba(0,0,0,.55), 0 8px 24px rgba(0,0,0,.36)',
        eyebrowColor: '#9aa6bd',
        titleColor: '#eef2f9',
        subtitleColor: '#9aa6bd',
        labelColor: '#9aa6bd',
        fieldBackground: '#1a2234',
        fieldBorder: '#232c40',
        fieldIcon: '#66718a',
        fieldRing: 'rgba(99, 102, 241, 0.45)',
        inputText: '#eef2f9',
        inputCaret: '#818cf8',
        toggleColor: '#9aa6bd',
        ctaBackground: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 46%, #22d3ee 100%)',
        ctaShadow: '0 16px 28px -18px rgba(99, 102, 241, 0.58)',
        footerColor: '#66718a',
        footerLinkColor: '#a5b4fc',
        selectorWrapBackground: '#141a28',
        selectorWrapBorder: 'rgba(35, 44, 64, 1)',
        selectorInactiveBackground: 'transparent',
        selectorInactiveBorder: 'rgba(35, 44, 64, 1)',
        selectorInactiveTitle: '#eef2f9',
        selectorInactiveDescription: '#66718a',
        selectorActiveBackground:
          'linear-gradient(135deg, rgba(99, 102, 241, 0.16), rgba(34, 211, 238, 0.09) 60%, rgba(244, 114, 182, 0.08))',
        selectorActiveBorder: 'rgba(99, 102, 241, 0.5)',
        selectorActiveTitle: '#818cf8',
        selectorActiveDescription: '#c7d2fe',
        artPanelBackground:
          'linear-gradient(150deg, #0b1020, #131a2e 60%, #0e1424)',
        artTitleColor: '#ffffff',
        artBodyColor: '#9aa6bd',
        artStatValue: '#ffffff',
        artStatLabel: '#9aa6bd',
      };
    }

    return {
      pageBackground:
        'radial-gradient(130% 120% at 0% 0%, #e8f5e9 0%, #f1f8f5 48%, #ebf5f0 100%)',
      orbOne: 'rgba(34, 139, 34, 0.13)',
      orbTwo: 'rgba(60, 179, 113, 0.11)',
      orbThree: 'rgba(34, 139, 34, 0.11)',
      cardBackground: '#ffffff',
      cardBorder: '1px solid rgba(144, 238, 144, 0.4)',
      cardShadow:
        '0 34px 72px -40px rgba(34, 139, 34, 0.52), 0 14px 24px -22px rgba(15, 23, 42, 0.26)',
      eyebrowColor: '#2d6b2d',
      titleColor: '#228b22',
      subtitleColor: '#67768e',
      labelColor: '#334155',
      fieldBackground: '#f8fdf8',
      fieldBorder: '#b3e5b3',
      fieldIcon: '#4a8f4a',
      fieldRing: 'rgba(60, 179, 113, 0.28)',
      inputText: '#0f172a',
      inputCaret: '#155015',
      toggleColor: '#6b7e9f',
      ctaBackground: 'linear-gradient(102deg, #228b22 0%, #1e7b1e 54%, #155015 100%)',
      ctaShadow: '0 18px 34px -20px rgba(34, 139, 34, 0.78)',
      footerColor: '#6b7280',
      footerLinkColor: '#155015',
      selectorWrapBackground: 'rgba(240, 250, 242, 0.88)',
      selectorWrapBorder: 'rgba(179, 229, 179, 0.85)',
      selectorInactiveBackground: 'transparent',
      selectorInactiveBorder: 'rgba(179, 229, 179, 0.5)',
      selectorInactiveTitle: '#335c33',
      selectorInactiveDescription: '#6b7e6b',
      selectorActiveBackground:
        'linear-gradient(135deg, rgba(34, 139, 34, 0.12), rgba(144, 238, 144, 0.18))',
      selectorActiveBorder: 'rgba(34, 139, 34, 0.35)',
      selectorActiveTitle: '#1f5f1f',
      selectorActiveDescription: '#527052',
      artPanelBackground: '',
      artTitleColor: '',
      artBodyColor: '',
      artStatValue: '',
      artStatLabel: '',
    };
  }, [isNovaDesign, selectedDesign]);

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

      await new Promise((resolve) => setTimeout(resolve, 100));

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
      className={[
        'relative min-h-screen overflow-hidden',
        isNovaDesign
          ? 'grid items-stretch'
          : 'flex items-center justify-center px-4 py-8 sm:px-6',
      ].join(' ')}
      style={{ background: isNovaDesign ? '#0a0e17' : designStyles.pageBackground }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className={[
            'rounded-full blur-3xl',
            isNovaDesign
              ? 'absolute -right-28 -top-32 h-[34rem] w-[34rem]'
              : 'absolute -top-24 -left-16 h-72 w-72',
          ].join(' ')}
          style={{ background: designStyles.orbOne }}
        />
        <div
          className={[
            'rounded-full blur-3xl',
            isNovaDesign
              ? 'absolute -bottom-40 left-[8%] h-[28rem] w-[28rem]'
              : 'absolute -bottom-24 -right-20 h-80 w-80',
          ].join(' ')}
          style={{ background: designStyles.orbTwo }}
        />
        <div
          className={[
            'rounded-full blur-3xl',
            isNovaDesign
              ? 'absolute right-[22%] top-[52%] h-60 w-60'
              : 'absolute left-1/2 top-[14%] h-52 w-52 -translate-x-1/2',
          ].join(' ')}
          style={{ background: designStyles.orbThree }}
        />
      </div>

      <section
        className={[
          'relative z-10 w-full',
          isNovaDesign
            ? 'grid min-h-screen grid-cols-1 lg:grid-cols-2'
            : '',
        ].join(' ')}
        style={{ maxWidth: isNovaDesign ? 'none' : '430px' }}
      >
        {isNovaDesign ? (
          <aside
            className="relative hidden overflow-hidden px-10 py-14 lg:flex lg:flex-col lg:justify-center xl:px-14"
            style={{ background: designStyles.artPanelBackground }}
          >
            <div className="relative z-10 max-w-[28rem]">
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.24em]"
                style={{ color: designStyles.eyebrowColor }}
              >
                {t('auth.login.eyebrow')}
              </p>
              <h1
                className="mt-8 font-display text-[2.45rem] font-extrabold leading-[1.08] tracking-[-0.04em]"
                style={{ color: designStyles.artTitleColor }}
              >
                {t('auth.login.heroTitle')}
              </h1>
              <p
                className="mt-4 max-w-[28rem] text-[15.5px] leading-[1.7]"
                style={{ color: designStyles.artBodyColor }}
              >
                {t('auth.login.subtitle')}
              </p>

              <div className="mt-10 flex flex-wrap gap-8">
                <div className="grid gap-1">
                  <strong
                    className="text-[1.9rem] font-extrabold tracking-[-0.03em]"
                    style={{ color: designStyles.artStatValue }}
                  >
                    24/7
                  </strong>
                  <span className="text-[13px]" style={{ color: designStyles.artStatLabel }}>
                    {t('auth.login.heroStats.uptime')}
                  </span>
                </div>
                <div className="grid gap-1">
                  <strong
                    className="text-[1.9rem] font-extrabold tracking-[-0.03em]"
                    style={{ color: designStyles.artStatValue }}
                  >
                    12+
                  </strong>
                  <span className="text-[13px]" style={{ color: designStyles.artStatLabel }}>
                    {t('auth.login.heroStats.modules')}
                  </span>
                </div>
                <div className="grid gap-1">
                  <strong
                    className="text-[1.9rem] font-extrabold tracking-[-0.03em]"
                    style={{ color: designStyles.artStatValue }}
                  >
                    1
                  </strong>
                  <span className="text-[13px]" style={{ color: designStyles.artStatLabel }}>
                    {t('auth.login.heroStats.workspace')}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        ) : null}

        <div
          className={[
            'flex flex-col justify-center',
            isNovaDesign ? 'px-5 py-8 sm:px-8 lg:px-12 xl:px-16' : '',
          ].join(' ')}
          style={{ background: isNovaDesign ? designStyles.cardBackground : 'transparent' }}
        >
        <article
          className={isNovaDesign ? 'mx-auto w-full max-w-[24rem]' : 'rounded-[24px] p-6 sm:p-8'}
          style={{
            backgroundColor: isNovaDesign ? 'transparent' : designStyles.cardBackground,
            boxShadow: isNovaDesign ? 'none' : designStyles.cardShadow,
            border: isNovaDesign ? 'none' : designStyles.cardBorder,
            backdropFilter: undefined,
          }}
        >
          <div className="text-center">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.24em]"
              style={{ color: designStyles.eyebrowColor }}
            >
              {t('auth.login.eyebrow')}
            </p>
            <h1
              className="mt-2 font-display text-[2.2rem] font-extrabold leading-none tracking-[-0.038em]"
              style={{ color: designStyles.titleColor }}
            >
              {isNovaDesign ? t('auth.login.signIn') : t('auth.login.title')}
            </h1>
            <p
              className="mt-3 text-[0.98rem] leading-relaxed"
              style={{ color: designStyles.subtitleColor }}
            >
              {t('auth.login.subtitle')}
            </p>
          </div>

          <div
            className={isNovaDesign ? 'mt-6 rounded-[14px] border p-2' : 'mt-6 rounded-[18px] border p-2'}
            style={{
              background: designStyles.selectorWrapBackground,
              borderColor: designStyles.selectorWrapBorder,
            }}
          >
            <p
              className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: designStyles.eyebrowColor }}
            >
              {t('auth.login.designLabel')}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {designOptions.map((option) => {
                const isActive = selectedDesign === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedDesign(option.id)}
                    className={[
                      'border px-4 py-3 text-left transition duration-fast hover:-translate-y-px',
                      isNovaDesign ? 'rounded-[10px]' : 'rounded-[14px]',
                    ].join(' ')}
                    style={{
                      background: isActive
                        ? designStyles.selectorActiveBackground
                        : designStyles.selectorInactiveBackground,
                      borderColor: isActive
                        ? designStyles.selectorActiveBorder
                        : designStyles.selectorInactiveBorder,
                      boxShadow: isActive
                        ? '0 16px 30px -24px rgba(15, 23, 42, 0.24)'
                        : 'none',
                    }}
                    aria-pressed={isActive}
                  >
                    <span
                      className="block text-[0.96rem] font-semibold"
                      style={{
                        color: isActive
                          ? designStyles.selectorActiveTitle
                          : designStyles.selectorInactiveTitle,
                      }}
                    >
                      {option.title}
                    </span>
                    <span
                      className="mt-1 block text-[12px] leading-relaxed"
                      style={{
                        color: isActive
                          ? designStyles.selectorActiveDescription
                          : designStyles.selectorInactiveDescription,
                      }}
                    >
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <form className="mt-7 grid gap-4" onSubmit={handleSubmit} noValidate>
            <label className="grid gap-2">
              <span
                className="text-[12px] font-semibold tracking-[0.01em]"
                style={{ color: designStyles.labelColor }}
              >
                {t('auth.login.usernameLabel')}
              </span>
              <span
                className={[
                  'relative flex h-[52px] items-center border transition duration-fast focus-within:ring-4',
                  isNovaDesign ? 'rounded-[10px]' : 'rounded-[14px]',
                ].join(' ')}
                style={{
                  backgroundColor: designStyles.fieldBackground,
                  borderColor: usernameHasError ? '#ef4444' : designStyles.fieldBorder,
                  boxShadow: isNovaDesign ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.95)',
                  ['--tw-ring-color' as string]: designStyles.fieldRing,
                }}
              >
                <FiUser
                  className="ml-4 h-[18px] w-[18px] shrink-0"
                  style={{ color: designStyles.fieldIcon }}
                />
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  required
                  aria-invalid={usernameHasError}
                  aria-describedby={usernameHasError ? 'login-username-error' : undefined}
                  placeholder={t('auth.login.usernamePlaceholder')}
                  className={[
                    'h-full w-full border-0 bg-transparent px-3.5 pr-3.5 text-[15px] font-medium placeholder:text-[14px] placeholder:text-slate-400 focus:outline-none',
                    isNovaDesign ? 'rounded-[10px]' : 'rounded-[14px]',
                  ].join(' ')}
                  style={{ color: designStyles.inputText, caretColor: designStyles.inputCaret }}
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
                style={{ color: designStyles.labelColor }}
              >
                {t('auth.login.passwordLabel')}
              </span>
              <span
                className={[
                  'relative flex h-[52px] items-center border transition duration-fast focus-within:ring-4',
                  isNovaDesign ? 'rounded-[10px]' : 'rounded-[14px]',
                ].join(' ')}
                style={{
                  backgroundColor: designStyles.fieldBackground,
                  borderColor: passwordHasError ? '#ef4444' : designStyles.fieldBorder,
                  boxShadow: isNovaDesign ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.95)',
                  ['--tw-ring-color' as string]: designStyles.fieldRing,
                }}
              >
                <FiLock
                  className="ml-4 h-[18px] w-[18px] shrink-0"
                  style={{ color: designStyles.fieldIcon }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  minLength={8}
                  aria-invalid={passwordHasError}
                  aria-describedby={passwordHasError ? 'login-password-error' : undefined}
                  className={[
                    'h-full w-full border-0 bg-transparent px-3.5 pr-12 text-[15px] font-medium placeholder:text-[14px] placeholder:text-slate-400 focus:outline-none',
                    isNovaDesign ? 'rounded-[10px]' : 'rounded-[14px]',
                  ].join(' ')}
                  style={{ color: designStyles.inputText, caretColor: designStyles.inputCaret }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className={[
                    'absolute right-2.5 inline-flex h-8 w-8 items-center justify-center rounded-lg transition duration-fast',
                    isNovaDesign ? 'hover:bg-white/5' : 'hover:bg-slate-100',
                  ].join(' ')}
                  aria-label={
                    showPassword
                      ? t('auth.login.hidePassword')
                      : t('auth.login.showPassword')
                  }
                  style={{ color: designStyles.toggleColor }}
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
              className={[
                'mt-2 inline-flex h-[52px] items-center justify-center gap-2 px-4 text-[1.02rem] font-semibold text-white transition duration-fast hover:-translate-y-px hover:brightness-105 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60',
                isNovaDesign ? 'rounded-[10px]' : 'rounded-[14px]',
              ].join(' ')}
              style={{
                background: designStyles.ctaBackground,
                boxShadow: designStyles.ctaShadow,
              }}
            >
              <FiArrowRight className="h-4 w-4" />
              {isSubmitting ? t('auth.login.signingIn') : t('auth.login.signIn')}
            </button>
          </form>
        </article>

        <footer
          className={isNovaDesign ? 'mx-auto mt-6 w-full max-w-[24rem] text-center text-[11px] leading-relaxed' : 'mt-6 text-center text-[11px] leading-relaxed'}
          style={{ color: designStyles.footerColor }}
        >
          <p>{t('auth.login.footerRights')}</p>
          <p className="mt-1.5">
            {t('auth.login.footerPowered')}{' '}
            <a
              href="https://www.cognilabs.org"
              target="_blank"
              rel="noreferrer"
              style={{ color: designStyles.footerLinkColor, fontWeight: 700 }}
            >
              Cognilabs
            </a>
          </p>
        </footer>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
