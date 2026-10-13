import { useSyncExternalStore } from 'react';
import { useIsAdmin } from './admin';
import { syncUserSettings } from './cloud';

// Whether the app is shown as a desktop window or inside a phone-sized frame. Remembered between launches, and shared
// by the sign-in screen and the app so the switch works on both.
const KEY = 'wallex-view';

let mobile = (() => {
  try {
    return localStorage.getItem(KEY) === 'mobile';
  } catch {
    return false;
  }
})();
const listeners = new Set<() => void>();

export const getMobileView = () => mobile;

export function setMobileView(next: boolean) {
  mobile = next;
  try {
    localStorage.setItem(KEY, next ? 'mobile' : 'desktop');
  } catch {
    // Not remembering the choice is fine.
  }
  listeners.forEach((l) => l());
  void syncUserSettings({ view_mode: next ? 'mobile' : 'desktop' });
}

export function hydrateMobileView(next: boolean) {
  mobile = next;
  try {
    localStorage.setItem(KEY, next ? 'mobile' : 'desktop');
  } catch {
    // The hydrated view still applies for this launch.
  }
  listeners.forEach((l) => l());
}

// A real phone: the screen is narrow, so the app uses its compact layout and fills the screen. This is decided by the
// screen, not by the switch below.
const SMALL = '(max-width: 767px)';
const smallQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(SMALL) : null;
const subscribeSmall = (cb: () => void) => {
  smallQuery?.addEventListener('change', cb);
  return () => smallQuery?.removeEventListener('change', cb);
};
export const useSmallScreen = (): boolean => useSyncExternalStore(subscribeSmall, () => Boolean(smallQuery?.matches), () => false);

// The switch's own setting, for the developer button.
export function useStoredMobileView(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => mobile,
  );
}

// The compact layout: on a real phone, or when a developer / admin account has switched the view to phone. The phone
// view is a developer tool, so everyone else on a wide screen always gets the desktop layout.
export function useMobileView(): boolean {
  const small = useSmallScreen();
  const admin = useIsAdmin();
  const stored = useStoredMobileView();
  return small || (stored && admin);
}

// The compact layout drawn inside a phone-shaped frame on a wide screen (the developer preview). On a real phone the app
// fills the screen with no frame.
export function useFramedView(): boolean {
  const small = useSmallScreen();
  const admin = useIsAdmin();
  const stored = useStoredMobileView();
  return !small && stored && admin;
}
