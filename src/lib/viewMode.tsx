import { createContext, useContext } from 'react';

// Whether the app is showing its phone-sized layout. Most pages adapt through container queries
// and need nothing from here; the ones that lay things out by hand (Patterns) read it.
const ViewModeContext = createContext({ mobile: false });

export const ViewModeProvider = ViewModeContext.Provider;
export const useMobile = () => useContext(ViewModeContext).mobile;
