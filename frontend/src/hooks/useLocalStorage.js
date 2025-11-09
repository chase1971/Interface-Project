import { useState, useEffect, useRef } from 'react';

// Custom hook for localStorage with automatic persistence
export const useLocalStorage = (key, initialValue) => {
  // Initialize state from localStorage
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return initialValue;
    }
  });

  // Track if this is the initial mount to prevent overwriting on first render
  const isInitialMount = useRef(true);

  // Save to localStorage whenever value changes (but skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
};

