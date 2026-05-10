import { createContext, useContext } from 'react';

const ModeContext = createContext('retail');

export function ModeProvider({ mode, children }) {
  return (
    <ModeContext.Provider value={mode}>{children}</ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
