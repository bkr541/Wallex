// What a new password must contain. Used wherever a password is created or changed (sign up, reset, Account), so the
// rules and the checklist shown to the person can never disagree. Logging in is not checked: an older, weaker password
// still works until the person changes it.

export interface PasswordRule {
  id: 'length' | 'upper' | 'number' | 'special';
  label: string;
  message: string; // shown when the form is submitted without it
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'At least 8 characters', message: 'Use at least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', message: 'Add an uppercase letter', test: (p) => /\p{Lu}/u.test(p) },
  { id: 'number', label: 'One number', message: 'Add a number', test: (p) => /\p{N}/u.test(p) },
  { id: 'special', label: 'One special character', message: 'Add a special character, such as ! or ?', test: (p) => /[^\p{L}\p{N}\s]/u.test(p) },
];

// The first thing missing, or null when the password is strong enough.
export const passwordError = (password: string): string | null => PASSWORD_RULES.find((r) => !r.test(password))?.message ?? null;
