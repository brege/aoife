import { useEffect } from 'react';

type OnOutsideCallback = (event: MouseEvent) => void;

const useOutside = (
  ref: React.RefObject<HTMLElement>,
  callback: OnOutsideCallback,
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

const useEscapeKey = (callback: () => void) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [callback]);
};

interface DropdownNavigationCallbacks {
  onMoveDown: () => void;
  onMoveUp: () => void;
  onSelect: () => void;
  onClose: () => void;
}

const useDropdownNavigation = (
  isOpen: boolean,
  callbacks: DropdownNavigationCallbacks,
) => {
  return (event: React.KeyboardEvent<HTMLElement>) => {
    if (!isOpen) {
      if (event.key === 'ArrowDown') {
        callbacks.onMoveDown();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        callbacks.onMoveDown();
        break;
      case 'ArrowUp':
        event.preventDefault();
        callbacks.onMoveUp();
        break;
      case 'Enter':
        event.preventDefault();
        callbacks.onSelect();
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        callbacks.onClose();
        break;
    }
  };
};

export { useDropdownNavigation, useOutside };
export default useEscapeKey;
