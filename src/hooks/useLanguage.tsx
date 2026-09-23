import React, { createContext, useContext, useState } from 'react';
import { Language, translations } from '../utils/translations';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: keyof typeof translations.en) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => translations.en[key] || String(key),
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('giri_giri_lang');
      return (saved === 'te' || saved === 'en') ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem('giri_giri_lang', newLang);
    } catch {
      // Ignore
    }
  };

  const t = (key: keyof typeof translations.en): string => {
    return translations[lang]?.[key] || translations.en[key] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
