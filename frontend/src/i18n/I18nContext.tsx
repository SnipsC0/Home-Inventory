import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import {
  Language,
  LANGUAGES,
  LANGUAGE_STORAGE_KEY as STORAGE_KEY,
  Translations,
  translations,
} from './translations';

interface I18nContextType {
  language: Language;
  t: Translations;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
  configLanguage?: Language; // Limba din config (default)
}

export function I18nProvider({ children, configLanguage }: I18nProviderProps) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored && LANGUAGES.includes(stored)) {
      return stored;
    }
    return configLanguage || 'en';
  });

  // The integration option is the source of truth; localStorage only caches it
  // for screens shown before the config has loaded.
  useEffect(() => {
    if (!configLanguage) return;
    if (configLanguage !== language) setLanguage(configLanguage);
    try {
      localStorage.setItem(STORAGE_KEY, configLanguage);
    } catch {
      /* storage unavailable */
    }
  }, [configLanguage]);

  const value: I18nContextType = {
    language,
    t: translations[language],
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  return context;
}
