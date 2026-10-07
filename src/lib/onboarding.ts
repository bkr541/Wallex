// New accounts finish a short local onboarding flow after their first sign-in. The marker is keyed by email so
// an existing account on the same computer is never sent through another person's unfinished onboarding.
import { syncUserSettings } from './cloud';

const keyFor = (email: string) => `wallex-onboarding-${email.trim().toLowerCase()}`;

export function markOnboardingPending(email: string) {
  try {
    localStorage.setItem(keyFor(email), 'pending');
  } catch {
    // If storage is unavailable, this launch can still continue normally after account creation.
  }
}

export function clearOnboardingPending(email: string) {
  try {
    localStorage.removeItem(keyFor(email));
  } catch {
    // Nothing else to clear.
  }
}

export function needsOnboarding(email: string): boolean {
  try {
    return localStorage.getItem(keyFor(email)) === 'pending';
  } catch {
    return false;
  }
}

export async function completeOnboarding(email: string) {
  try {
    localStorage.setItem(keyFor(email), 'complete');
  } catch {
    // Completion still lasts for the current mounted app through its local state.
  }
  await syncUserSettings({ onboarding_completed: true });
}

export function hydrateOnboarding(email: string, completed: boolean) {
  try {
    localStorage.setItem(keyFor(email), completed ? 'complete' : 'pending');
  } catch {
    // The caller can still hold the state for this launch.
  }
}
