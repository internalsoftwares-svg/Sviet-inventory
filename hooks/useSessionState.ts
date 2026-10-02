'use client'
import { useState, useEffect, useCallback } from 'react';

/**
 * A custom hook that behaves like useState but persists the state to sessionStorage.
 * This ensures that on page refresh or back-navigation, the state is retained.
 * 
 * @param key The unique string key for sessionStorage
 * @param initialValue The initial value if no state is saved
 */
export function useSessionState<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // We initialize with the default value so SSR matches initial client render
  const [state, setState] = useState<T>(initialValue);

  // Once mounted on the client, we read from sessionStorage and update state if needed
  useEffect(() => {
    try {
      const item = sessionStorage.getItem(key);
      if (item !== null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(JSON.parse(item));
      }
    } catch (e) {
      console.error('Error reading sessionStorage for key:', key, e);
    }
  }, [key]);

  // Wrapped setter to update both React state and sessionStorage
  const setPersistentState = useCallback((value: T | ((val: T) => T)) => {
    setState((prevState) => {
      const newValue = value instanceof Function ? value(prevState) : value;
      try {
        sessionStorage.setItem(key, JSON.stringify(newValue));
      } catch (e) {
        console.error('Error setting sessionStorage for key:', key, e);
      }
      return newValue;
    });
  }, [key]);

  return [state, setPersistentState];
}
