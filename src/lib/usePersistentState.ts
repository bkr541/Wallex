import { useEffect, useState } from 'react';

// useState that survives reloads via localStorage. Falls back to the default if storage is unavailable.
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage unavailable; keep the in-memory value
    }
  }, [key, value]);

  return [value, setValue] as const;
}
