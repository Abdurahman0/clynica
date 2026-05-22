import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactCountryFlag from 'react-country-flag';
import AppIcon from '../components/shared/icons/AppIcon';
import { SUPPORTED_LANGUAGES } from '../i18n';

type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const LANGUAGE_COUNTRY_CODES: Record<SupportedLanguage, string> = {
  uz: 'UZ',
  ru: 'RU',
};

function resolveActiveLanguage(language: string): SupportedLanguage {
  const exactMatch = SUPPORTED_LANGUAGES.find((item) => item === language);

  if (exactMatch) {
    return exactMatch;
  }

  const prefixedMatch = SUPPORTED_LANGUAGES.find((item) =>
    language.startsWith(`${item}-`),
  );

  return prefixedMatch ?? 'uz';
}

function LanguageDropdown() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement | null>(null);
  const activeLanguage = useMemo(
    () => resolveActiveLanguage(i18n.language),
    [i18n.language],
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!languageMenuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  function handleLanguageChange(nextLanguage: SupportedLanguage) {
    void i18n.changeLanguage(nextLanguage);
    setIsMenuOpen(false);
  }

  return (
    <div
      ref={languageMenuRef}
      className={['relative', isMenuOpen ? 'z-[120]' : 'z-20'].join(' ')}
    >
      <button
        type="button"
        className="inline-flex h-10 items-center gap-2 rounded-pill bg-surface-card px-2.5 text-text-secondary shadow-sm ring-1 ring-border-soft/40 transition duration-fast hover:bg-primary/10 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        aria-label={t('common.language')}
        onClick={() => setIsMenuOpen((current) => !current)}
      >
        <ReactCountryFlag
          countryCode={LANGUAGE_COUNTRY_CODES[activeLanguage]}
          svg
          style={{ width: '1.15em', height: '1.15em' }}
          title={t(`common.languages.${activeLanguage}`)}
        />
        <span className="hidden text-xs font-semibold text-text-primary min-[960px]:inline">
          {t(`common.languages.${activeLanguage}`)}
        </span>
        <AppIcon
          name="chevron-down"
          className={[
            'h-4 w-4 text-text-muted transition duration-fast',
            isMenuOpen ? 'rotate-180 text-text-secondary' : '',
          ].join(' ')}
          aria-hidden="true"
        />
      </button>

      {isMenuOpen ? (
        <div
          className="absolute right-0 top-[calc(100%+10px)] w-[190px] overflow-hidden rounded-xl bg-surface-card p-1.5 shadow-[0_22px_44px_-30px_rgba(25,28,30,0.38)] ring-1 ring-border-soft/40"
          role="menu"
          aria-label={t('common.language')}
        >
          <div className="grid gap-1">
            {SUPPORTED_LANGUAGES.map((language) => (
              <button
                key={language}
                type="button"
                className={[
                  'inline-flex min-h-9 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-medium transition duration-fast',
                  activeLanguage === language
                    ? 'bg-primary/12 text-text-primary'
                    : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary',
                ].join(' ')}
                onClick={() => handleLanguageChange(language)}
                role="menuitem"
              >
                <span className="inline-flex items-center gap-2">
                  <ReactCountryFlag
                    countryCode={LANGUAGE_COUNTRY_CODES[language]}
                    svg
                    style={{ width: '1.15em', height: '1.15em' }}
                    title={t(`common.languages.${language}`)}
                  />
                  <span>{t(`common.languages.${language}`)}</span>
                </span>
                {activeLanguage === language ? (
                  <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default LanguageDropdown;
