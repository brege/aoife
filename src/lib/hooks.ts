import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';

export const useLocalStorage = (
  key: string,
  defaultValue: boolean,
): [boolean, (value: boolean) => void] => {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    if (stored === null) {
      return defaultValue;
    }
    return stored === 'true';
  });

  const setStoredValue = useCallback(
    (newValue: boolean) => {
      setValue(newValue);
      localStorage.setItem(key, String(newValue));
    },
    [key],
  );

  return [value, setStoredValue];
};

export const useLocalStorageString = <T extends string>(
  key: string,
  defaultValue: T,
  allowedValues: readonly T[],
): [T, (value: T) => void] => {
  if (!allowedValues.includes(defaultValue)) {
    throw new Error('Default value must be in allowedValues');
  }

  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    if (stored === null) {
      return defaultValue;
    }
    return allowedValues.includes(stored as T)
      ? (stored as T)
      : defaultValue;
  });

  const setStoredValue = useCallback(
    (newValue: T) => {
      if (!allowedValues.includes(newValue)) {
        throw new Error('Local storage value is not allowed');
      }
      setValue(newValue);
      localStorage.setItem(key, newValue);
    },
    [allowedValues, key],
  );

  return [value, setStoredValue];
};

export const useResizeObserver = (
  ref: RefObject<HTMLElement | null>,
  callback: () => void,
): void => {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    callback();

    const observer = new ResizeObserver(callback);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, callback]);
};
