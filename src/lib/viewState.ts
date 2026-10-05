import { useSyncExternalStore } from 'react';

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

export function setMobileView(next: boolean) {
  mobile = next;
  try {
    localStorage.setItem(KEY, next ? 'mobile' : 'desktop');
  } catch {
    // Not remembering the choice is fine.
  }
  listeners.forEach((l) => l());
}

export function useMobileView(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => mobile,
  );
}
