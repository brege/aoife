import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { FiGrid } from 'react-icons/fi';
import { HiOutlinePencilAlt } from 'react-icons/hi';
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
          <div className="menu-actions">
            <button
              type="button"
              className={`menu-icon-button${isBuilderMode ? ' active' : ''}`}
              aria-pressed={isBuilderMode}
              aria-label="Toggle editor"
              title={isBuilderMode ? 'Show grid' : 'Show editor'}
              onClick={() => handleModeSelect(!isBuilderMode)}
            >
              {isBuilderMode ? (
                <FiGrid size={20} />
              ) : (
                <HiOutlinePencilAlt size={20} />
              )}
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

export default Menu;
