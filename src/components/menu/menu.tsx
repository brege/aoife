import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import './menu.css';
import logger from '../../lib/logger';
import MenuClear from './clear';
import MenuConfig from './config';

interface MenuProps {
  onClearGrid: () => void;
  columns: number;
  onColumnsChange: (columns: number) => void;
  minRows: number;
  onMinRowsChange: (minRows: number) => void;
  isBuilderMode: boolean;
  onBuilderModeToggle: (enabled: boolean) => void;
}

const Menu: React.FC<MenuProps> = ({
  onClearGrid,
  columns,
  onColumnsChange,
  minRows,
  onMinRowsChange,
  isBuilderMode,
  onBuilderModeToggle,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleMenu = () => {
    const newState = !isOpen;
    setIsOpen(newState);

    logger.info(`MENU: ${newState ? 'Opened' : 'Closed'} hamburger menu`, {
      context: 'HamburgerMenu.toggleMenu',
      action: 'menu_toggle',
      timestamp: Date.now(),
    });
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleModeSelect = (builderModeEnabled: boolean) => {
    if (isBuilderMode === builderModeEnabled) {
      closeMenu();
      return;
    }

    onBuilderModeToggle(builderModeEnabled);
    logger.info(
      `MENU: Switched to ${
        builderModeEnabled ? 'builder' : 'presentation'
      } mode`,
      {
        context: 'MenuMode.toggle',
        action: 'mode_toggle',
        builderMode: builderModeEnabled,
        timestamp: Date.now(),
      },
    );
    closeMenu();
  };

  return (
    <div className="hamburger-menu-container">
      <button
        type="button"
        ref={buttonRef}
        className={`hamburger-button${isOpen ? ' open' : ''}`}
        onClick={toggleMenu}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
      >
        <div className={`hamburger-icon ${isOpen ? 'open' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      {isOpen && (
        <div className="menu-dropdown" ref={menuRef}>
          <div className="menu-header">
            <h3>Settings</h3>
          </div>

          <div className="menu-actions">
            <button
              type="button"
              className={`menu-icon-button${isBuilderMode ? ' active' : ''}`}
              aria-pressed={isBuilderMode}
              aria-label="Toggle editor"
              title="Editor"
              onClick={() => handleModeSelect(!isBuilderMode)}
            >
              <BuilderModeIcon />
            </button>

            <MenuClear onClearGrid={onClearGrid} onMenuClose={closeMenu} />
          </div>

          <MenuConfig
            onMenuClose={closeMenu}
            columns={columns}
            onColumnsChange={onColumnsChange}
            minRows={minRows}
            onMinRowsChange={onMinRowsChange}
          />
        </div>
      )}
    </div>
  );
};

const BuilderModeIcon: React.FC = () => (
  <svg viewBox="0 0 36 36" role="img" aria-hidden="true" focusable="false">
    <path
      d="M21 12H7a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1Zm-13-2h12V8H8Z"
      fill="currentColor"
    />
    <path
      d="M21 14.08H7a1 1 0 0 0-1 1V19a1 1 0 0 0 1 1h11.36L22 16.3v-1.22a1 1 0 0 0-1-1Zm-1 3.92H8v-2h12Z"
      fill="currentColor"
    />
    <path
      d="M11.06 31.45l.32-1.39H4V4h20v10.25L26 12.36V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v28a1 1 0 0 0 1 1h8a3.26 3.26 0 0 1 .06-.55Z"
      fill="currentColor"
    />
    <path d="M22 19.17l-.78.79A1 1 0 0 0 22 19.17Z" fill="currentColor" />
    <path
      d="M6 26.94a1 1 0 0 0 1 1h4.84l.43-1.9H8V24h6.34l2-2H7a1 1 0 0 0-1 1Z"
      fill="currentColor"
    />
    <path
      d="M33.49 16.67l-3.37-3.37a1.61 1.61 0 0 0-2.28 0L14.13 27.09 13 31.9a1.61 1.61 0 0 0 1.26 1.9l.31.06a1.15 1.15 0 0 0 .37 0l4.85-1.07L33.49 19a1.6 1.6 0 0 0 0-2.27Zm-14.72 14.24l-3.66.81L16 28.09l10.28-10.39 2.82 2.82Zm11.46-11.52-2.82-2.82L29 15l2.84 2.84Z"
      fill="currentColor"
    />
  </svg>
);

export default Menu;
