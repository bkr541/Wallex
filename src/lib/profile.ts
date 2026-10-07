import { useSyncExternalStore } from 'react';
import { syncProfile } from './cloud';

// The person's own details, kept on this device (localStorage) until sign-in is connected. Nothing here comes
// from the bank.

export interface Profile {
  firstName: string;
  lastName: string;
  preferredName: string; // what Wallex calls you; falls back to the first name
  email: string;
  phone: string;
  photo: string | null; // a small square image as a data URL
}

export const EMPTY_PROFILE: Profile = { firstName: '', lastName: '', preferredName: '', email: '', phone: '', photo: null };

const KEY = 'wallex-profile';

function load(): Profile {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (raw && typeof raw === 'object') {
      const str = (v: unknown) => (typeof v === 'string' ? v : '');
      return {
        firstName: str(raw.firstName),
        lastName: str(raw.lastName),
        preferredName: str(raw.preferredName),
        email: str(raw.email),
        phone: str(raw.phone),
        photo: typeof raw.photo === 'string' ? raw.photo : null,
      };
    }
  } catch {
    // Fall through to an empty profile.
  }
  return EMPTY_PROFILE;
}

let state = load();
const listeners = new Set<() => void>();

export const getProfile = () => state;

export function saveProfile(next: Profile) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage can be blocked or full (a large photo); the change then lasts until the app closes.
  }
  listeners.forEach((l) => l());
  void syncProfile(next);
}

// Cloud hydration updates the local cache without echoing the same row back to Supabase.
export function hydrateProfile(next: Profile) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // The hydrated value still lasts for this launch.
  }
  listeners.forEach((l) => l());
}

export function useProfile(): Profile {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

export const displayName = (p: Profile) => p.preferredName.trim() || p.firstName.trim();
export const fullName = (p: Profile) => [p.firstName.trim(), p.lastName.trim()].filter(Boolean).join(' ');
export const initials = (p: Profile) => ((p.firstName.trim()[0] ?? '') + (p.lastName.trim()[0] ?? '')).toUpperCase();

// Crops a chosen picture to a centred square and shrinks it so it is cheap to keep.
export function photoFromFile(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Could not read the picture'));
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file is not a picture'));
    };
    img.src = url;
  });
}
