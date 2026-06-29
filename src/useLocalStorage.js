import { useState, useEffect } from "react";

// Persist a piece of state to localStorage. Used for the wishlist and
// buyer profile (Steps 3 & 6). Scaffolded now, populated later.
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore write failures (private mode, quota)
    }
  }, [key, value]);

  return [value, setValue];
}
