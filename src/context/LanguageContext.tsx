import React, { createContext, useState, useEffect } from 'react';
import { en } from '../locales/en';
import { hi } from '../locales/hi';
import type { Language } from '../types';
import { useTranslation } from './useTranslation';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: typeof en;
}

const STORAGE_KEY = 'shaadisaathi_language';

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'hi' || saved === 'en') {
        return saved;
      }
    } catch {
      // Fallback if localStorage is inaccessible
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Silently ignore storage errors in restricted contexts
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.title =
      language === 'hi'
        ? 'शादीसाथी | हर पल ख़ास, हर रुपये का हिसाब।'
        : 'ShaadiSaathi | Every Moment Special. Every Rupee Accounted For.';
  }, [language]);

  const t = language === 'hi' ? hi : en;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export { useTranslation };
