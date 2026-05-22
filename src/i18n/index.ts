import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './locales/ru.json';
import uz from './locales/uz.json';

const LANGUAGE_STORAGE_KEY = 'renaissance-clinic-language';
const SUPPORTED_LANGUAGES = ['uz', 'ru'] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function isSupportedLanguage(value: string): value is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
}

function resolveInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') {
    return 'uz';
  }

  try {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLanguage && isSupportedLanguage(storedLanguage)) {
      return storedLanguage;
    }
  } catch {
    return 'uz';
  }

  return 'uz';
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      uz: { translation: uz },
      ru: { translation: ru },
    },
    lng: resolveInitialLanguage(),
    fallbackLng: 'uz',
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  });
}

i18n.on('languageChanged', (language) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!isSupportedLanguage(language)) {
    return;
  }

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore storage write failures and keep language in memory.
  }
});

export { LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES };
export default i18n;
