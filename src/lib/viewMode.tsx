import { createContext, useContext } from 'react';

// Whether the app is showing its phone-sized layout, and the phone frame itself. Most pages adapt
// through container queries and need nothing from here; the ones that lay things out by hand
// (Patterns) read the mode, and pop-ups that must sit inside the phone frame render into it.
interface ViewMode {
  mobile: boolean;
  frame: HTMLElement | null;
}

const ViewModeContext = createContext<ViewMode>({ mobile: false, frame: null });

export const ViewModeProvider = ViewModeContext.Provider;
export const useMobile = () => useContext(ViewModeContext).mobile;
export const usePhoneFrame = () => useContext(ViewModeContext).frame;
