import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { FaGithub } from 'react-icons/fa';
import { FiGrid } from 'react-icons/fi';
import { HiOutlinePencilAlt } from 'react-icons/hi';
import { VscSourceControl } from 'react-icons/vsc';
import './menu.css';
import packageJson from '../../../package.json';
import logger from '../../lib/logger';
import { useModalClosed, useModalManager } from '../../lib/modalmanager';
import { useOnClickOutside } from '../ui/useonclickoutside';
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
  const { openModal, closeModal } = useModalManager();

  useOnClickOutside(
    menuRef,
    (event) => {
      if (
        buttonRef.current &&
        buttonRef.current.contains(event.target as Node)
      ) {
        return;
      }
      setIsOpen(false);
    },
    isOpen,
  );

  useEffect(() => {
    if (isOpen) {
      openModal('hamburger');
    } else {
      closeModal('hamburger');
    }
  }, [isOpen, openModal, closeModal]);

  useModalClosed('hamburger', () => setIsOpen(false));

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
  };

  const appVersion = packageJson.version ?? '';

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
            <MenuClear onClearGrid={onClearGrid} onMenuClose={closeMenu} />
            <button
              type="button"
              className={`menu-icon-button menu-view-toggle${isBuilderMode ? ' active' : ''}`}
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
          </div>

          <MenuConfig
            onMenuClose={closeMenu}
            columns={columns}
            onColumnsChange={onColumnsChange}
            minRows={minRows}
            onMinRowsChange={onMinRowsChange}
          />

          <div className="menu-about menu-grid-config-section">
            <div className="grid-config-header">
              <h3>About</h3>
            </div>
            <div className="menu-about-row">
              <a
                className="menu-about-link"
                href="https://github.com/brege/aoife"
                target="_blank"
                rel="noreferrer"
              >
                <FaGithub aria-hidden="true" focusable="false" />
                <span>aoife</span>
              </a>
              <a
                className="menu-about-link menu-about-version"
                href="https://github.com/brege/aoife"
                target="_blank"
                rel="noreferrer"
              >
                <VscSourceControl aria-hidden="true" focusable="false" />
                <span>v{appVersion}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;
