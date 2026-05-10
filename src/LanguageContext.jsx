import { createContext, useContext } from 'react';
import translations from './translations';
import { useMode } from './ModeContext';

const LanguageContext = createContext('fr');

export function LanguageProvider({ lang, children }) {
  return (
    <LanguageContext.Provider value={lang}>{children}</LanguageContext.Provider>
  );
}

export function useTranslation() {
  const lang = useContext(LanguageContext);
  const mode = useMode();
  return { t: translations[mode][lang], lang, mode };
}
