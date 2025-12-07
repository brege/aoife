import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import './menu.css';
import logger from '../../lib/logger';
import type { GridLayoutMode } from '../grid/grid';
import MenuClear from './clear';
import MenuConfig from './config';

interface MenuProps {
  onClearGrid: () => void;
  gridLayoutMode: GridLayoutMode;
  onGridLayoutModeChange: (mode: GridLayoutMode) => void;
  fitToScreen: boolean;
  onFitToScreenChange: (enabled: boolean) => void;
  isSearchPanelVisible: boolean;
  onSearchPanelToggle: (visible: boolean) => void;
}

const Menu: React.FC<MenuProps> = ({
  onClearGrid,
  gridLayoutMode,
  onGridLayoutModeChange,
  fitToScreen,
  onFitToScreenChange,
  isSearchPanelVisible,
  onSearchPanelToggle,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu on outside click
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

    const menuState = {
      isOpen: newState,
      availableOptions: [
        {
          section: 'Search Panel',
          items: [
            {
              name: isSearchPanelVisible
                ? 'Hide search panel'
                : 'Show search panel',
              type: 'action',
              enabled: true,
            },
          ],
        },
        {
          section: 'Grid',
          items: [{ name: 'Clear Grid', type: 'action', enabled: true }],
        },
        {
          section: 'Layout',
          items: [
            {
              name: 'Grid layout options',
              type: 'placeholder',
              enabled: false,
            },
          ],
        },
      ],
    };

    logger.info(`MENU: ${newState ? 'Opened' : 'Closed'} hamburger menu`, {
      context: 'HamburgerMenu.toggleMenu',
      action: 'menu_toggle',
      menuState,
      timestamp: Date.now(),
    });
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <div className="hamburger-menu-container">
      {/* Hamburger Button */}
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

      {/* Menu Dropdown */}
      {isOpen && (
        <div className="menu-dropdown" ref={menuRef}>
          <div className="menu-header">
            <h3>Settings</h3>
            <button type="button" className="close-button" onClick={toggleMenu}>
              ×
            </button>
          </div>

          <div className="menu-section">
            <h4>Search Panel</h4>
            <button
              type="button"
              className="menu-option"
              onClick={() => {
                const nextValue = !isSearchPanelVisible;
                onSearchPanelToggle(nextValue);
                logger.info(
                  `MENU: ${nextValue ? 'Showing' : 'Hiding'} search panel`,
                  {
                    context: 'MenuSearchPanel.toggle',
                    action: 'search_panel_toggle',
                    isVisible: nextValue,
                    timestamp: Date.now(),
                  },
                );
                closeMenu();
              }}
            >
              {isSearchPanelVisible ? 'Hide search form' : 'Show search form'}
            </button>
          </div>

          <div className="menu-section">
            <h4>Grid Options</h4>
            <MenuClear onClearGrid={onClearGrid} onMenuClose={closeMenu} />
          </div>

          <MenuConfig
            onMenuClose={closeMenu}
            layoutMode={gridLayoutMode}
            onLayoutModeChange={onGridLayoutModeChange}
            fitToScreen={fitToScreen}
            onFitToScreenChange={onFitToScreenChange}
          />
        </div>
      )}
    </div>
  );
};

export default Menu;
