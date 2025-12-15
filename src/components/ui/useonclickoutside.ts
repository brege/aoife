import { useEffect } from 'react';

type OnClickOutsideCallback = (event: MouseEvent) => void;

export const useOnClickOutside = (
  ref: React.RefObject<HTMLElement>,
  callback: OnClickOutsideCallback,
  enabled = true,
) => {
  useEffect(() => {
    if (!enabled) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback(event);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, callback, enabled]);
};
