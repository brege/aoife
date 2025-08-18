import React, { useState, useEffect, useRef } from 'react';
import './hamburger-menu.css';
import MenuClearGrid from './menu-clear-grid';
import MenuMediaType from './menu-media-type';
import { MediaType } from '../../types/media';
import logger from '../../utils/logger';

interface HamburgerMenuProps {
  onClearGrid: () => void;
  selectedMediaType: MediaType;
  onMediaTypeChange: (type: MediaType) => void;
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ onClearGrid, selectedMediaType, onMediaTypeChange }) => {
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
    
    // Report menu state and available options
    const menuState = {
      isOpen: newState,
      availableOptions: [
        { 
          section: 'Media Type',
          items: [
            { name: `Current: ${selectedMediaType}`, type: 'info', enabled: true },
            { name: 'Movies', type: 'action', enabled: selectedMediaType !== 'movies' },
            { name: 'Books', type: 'action', enabled: selectedMediaType !== 'books' },
            { name: 'Music', type: 'action', enabled: selectedMediaType !== 'music' }
          ]
        },
        { 
          section: 'Grid Options',
          items: [
            { name: 'Clear Grid', type: 'action', enabled: true }
          ]
        },
        {
          section: 'Layout Configuration', 
          items: [
            { name: 'Grid layout options', type: 'placeholder', enabled: false }
          ]
        }
      ]
    };
    
    logger.info(`MENU: ${newState ? 'Opened' : 'Closed'} hamburger menu`, {
      context: 'HamburgerMenu.toggleMenu',
      action: 'menu_toggle',
      menuState,
      timestamp: Date.now()
    });
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <div className="hamburger-menu-container">
      {/* Hamburger Button */}
      <button 
        ref={buttonRef}
        className="hamburger-button"
        onClick={toggleMenu}
        aria-label={isOpen ? "Close menu" : "Open menu"}
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
            <button className="close-button" onClick={toggleMenu}>×</button>
          </div>
            
            <div className="menu-section">
              <h4>Media Type</h4>
              <MenuMediaType 
                selectedMediaType={selectedMediaType}
                onMediaTypeChange={onMediaTypeChange}
                onMenuClose={closeMenu}
              />
            </div>

            <div className="menu-section">
              <h4>Grid Options</h4>
              <MenuClearGrid 
                onClearGrid={onClearGrid}
                onMenuClose={closeMenu}
              />
            </div>

          <div className="menu-section">
            <h4>Layout Configuration</h4>
            <p className="menu-placeholder">Grid layout options coming soon...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HamburgerMenu;