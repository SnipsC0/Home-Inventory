import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { Language, Translations, translations } from './translations';

const STORAGE_KEY = 'home_inventory_language';

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
    if (stored && (stored === 'en' || stored === 'ro')) {
      return stored;
    }
    return configLanguage || 'en';
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored && configLanguage && configLanguage !== language) {
      setLanguage(configLanguage);
      localStorage.setItem(STORAGE_KEY, configLanguage);
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
