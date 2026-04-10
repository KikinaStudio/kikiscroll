import { createContext, useContext } from 'react';
import translations from './translations';

const LanguageContext = createContext('fr');

export function LanguageProvider({ lang, children }) {
  return (
    <LanguageContext.Provider value={lang}>{children}</LanguageContext.Provider>
  );
}

export function useTranslation() {
  const lang = useContext(LanguageContext);
  return { t: translations[lang], lang };
}
