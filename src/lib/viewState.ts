import { useSyncExternalStore } from 'react';
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

export function useMobileView(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => mobile,
  );
}
