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
