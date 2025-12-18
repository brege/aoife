import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';

type Modal = 'searchResults' | 'posterGrid' | 'hamburger' | 'platformDropdown';

interface ModalContextType {
  openModal: (modal: Modal) => void;
  closeModal: (modal: Modal) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const openModalsRef = useRef<Set<Modal>>(new Set());

  const closeModal = useCallback((modal: Modal) => {
    openModalsRef.current.delete(modal);
    window.dispatchEvent(new CustomEvent('modalClosed', { detail: { modal } }));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openModalsRef.current.size > 0) {
        event.preventDefault();
        const modals = Array.from(openModalsRef.current);
        const lastModal = modals[modals.length - 1];
        closeModal(lastModal);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeModal]);

  const openModal = (modal: Modal) => {
    openModalsRef.current.add(modal);
  };

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModalManager = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalManager must be used within ModalProvider');
  }
  return context;
};

export const useModalClosed = (modal: Modal, onClose: () => void) => {
  useEffect(() => {
    const handleModalClosed = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.modal === modal) {
        onClose();
      }
    };

    window.addEventListener('modalClosed', handleModalClosed);
    return () => window.removeEventListener('modalClosed', handleModalClosed);
  }, [modal, onClose]);
};
