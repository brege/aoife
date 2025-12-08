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

  return (
    <div className="hamburger-menu-container">
      <button
        type="button"
        ref={buttonRef}
        className="hamburger-button"
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
            <button type="button" className="close-button" onClick={toggleMenu}>
              x
            </button>
          </div>

          <div className="menu-section">
            <h4>Mode</h4>
            <button
              type="button"
              className="menu-option"
              onClick={() => {
                const nextValue = !isBuilderMode;
                onBuilderModeToggle(nextValue);
                logger.info(
                  `MENU: Switched to ${nextValue ? 'builder' : 'presentation'} mode`,
                  {
                    context: 'MenuMode.toggle',
                    action: 'mode_toggle',
                    builderMode: nextValue,
                    timestamp: Date.now(),
                  },
                );
                closeMenu();
              }}
            >
              {isBuilderMode
                ? 'Enter presentation mode'
                : 'Return to builder mode'}
            </button>
          </div>

          <div className="menu-section">
            <h4>Grid Options</h4>
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
