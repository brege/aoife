import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  FaChevronDown,
  FaChevronRight,
  FaGithub,
  FaRegCopy,
} from 'react-icons/fa';
import { FiShare2 } from 'react-icons/fi';
import { VscSourceControl } from 'react-icons/vsc';
import './menu.css';
import packageJson from '../../../package.json';
import { useOutside } from '../../lib/escape';
import logger from '../../lib/logger';
import { useModalClosed, useModalManager } from '../../lib/modalmanager';
import MenuConfig from './config';

interface MenuProps {
  onClearGrid: () => void;
  columns: number;
  onColumnsChange: (columns: number) => void;
  minRows: number;
  onMinRowsChange: (minRows: number) => void;
  layoutDimension: 'width' | 'height';
  onLayoutDimensionChange: (dimension: 'width' | 'height') => void;
  bandPlacementMode: 'alwaysTop' | 'adaptive';
  onBandPlacementModeChange: (mode: 'alwaysTop' | 'adaptive') => void;
  captionMode: 'hidden' | 'overlay';
  onCaptionModeChange: (mode: 'hidden' | 'overlay') => void;
  onShare: () => void;
  isSharing: boolean;
  shareUrl: string;
  shareError: string;
  isLoadingShare: boolean;
  coverViewMode?: 'grid' | 'carousel';
  onCoverViewModeChange?: (mode: 'grid' | 'carousel') => void;
}

const Menu: React.FC<MenuProps> = ({
  onClearGrid,
  columns,
  onColumnsChange,
  minRows,
  onMinRowsChange,
  layoutDimension,
  onLayoutDimensionChange,
  bandPlacementMode,
  onBandPlacementModeChange,
  captionMode,
  onCaptionModeChange,
  onShare,
  isSharing,
  shareUrl,
  shareError,
  isLoadingShare,
  coverViewMode,
  onCoverViewModeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const { openModal, closeModal } = useModalManager();
  const [copyError, setCopyError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    setCopySuccess(false);
    setCopyError('');
  }, []);

  useOutside(
    menuRef,
    (event) => {
      if (buttonRef.current?.contains(event.target as Node)) {
        return;
      }
      setIsOpen(false);
    },
    isOpen,
  );

  useEffect(() => {
    if (!showResetConfirm) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        confirmRef.current &&
        !confirmRef.current.contains(event.target as Node)
      ) {
        setShowResetConfirm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showResetConfirm]);

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

  const handleCopyShare = async () => {
    if (!shareUrl) {
      setCopyError('Create a share link before copying.');
      setCopySuccess(false);
      return;
    }
    if (!navigator.clipboard) {
      setCopyError('Clipboard is not available in this browser.');
      setCopySuccess(false);
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyError('');
      setCopySuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setCopyError(message);
      setCopySuccess(false);
    }
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
        <div className="hamburger-icon">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      {isOpen && (
        <div className="menu-dropdown" ref={menuRef}>
          <div className="menu-permalink">
            <div className="menu-permalink-header">
              <h3>Share</h3>
              {isSharing && (
                <span className="menu-permalink-status">Creating…</span>
              )}
              {isLoadingShare && !isSharing && (
                <span className="menu-permalink-status">Loading…</span>
              )}
              {copySuccess && (
                <span className="menu-permalink-status success">Copied</span>
              )}
            </div>
            <div className="menu-permalink-row">
              <input
                type="text"
                value={shareUrl}
                readOnly
                placeholder={
                  isLoadingShare
                    ? 'Loading shared grid...'
                    : 'Create a share link'
                }
                className="menu-permalink-input"
                aria-label="Share URL"
              />
              <button
                type="button"
                className="menu-permalink-copy"
                onClick={handleCopyShare}
                disabled={!shareUrl}
                aria-label="Copy share URL"
                title="Copy share URL"
              >
                <FaRegCopy size={16} aria-hidden="true" focusable="false" />
                <span className="menu-permalink-copy-label">Copy</span>
              </button>
              <button
                type="button"
                className={`menu-permalink-button${isSharing ? ' active' : ''}`}
                aria-label="Create share link"
                title="Create share link"
                onClick={onShare}
                disabled={isSharing || isLoadingShare}
              >
                <FiShare2 size={20} />
              </button>
            </div>
            {(shareError || copyError) && (
              <div className="menu-permalink-error">
                {shareError || copyError}
              </div>
            )}
          </div>

          <MenuConfig
            onMenuClose={closeMenu}
            columns={columns}
            onColumnsChange={onColumnsChange}
            minRows={minRows}
            onMinRowsChange={onMinRowsChange}
            layoutDimension={layoutDimension}
            onLayoutDimensionChange={onLayoutDimensionChange}
            bandPlacementMode={bandPlacementMode}
            onBandPlacementModeChange={onBandPlacementModeChange}
            captionMode={captionMode}
            onCaptionModeChange={onCaptionModeChange}
            coverViewMode={coverViewMode}
            onCoverViewModeChange={onCoverViewModeChange}
          />

          <details className="menu-status menu-grid-config-section">
            <summary className="menu-status-summary">
              <span className="menu-status-summary-label">
                <span>Is it down?</span>
                <FaChevronRight
                  className="menu-status-chevron menu-status-chevron-right"
                  aria-hidden="true"
                  focusable="false"
                />
                <FaChevronDown
                  className="menu-status-chevron menu-status-chevron-down"
                  aria-hidden="true"
                  focusable="false"
                />
              </span>
            </summary>
            <ul className="menu-status-links">
              <li>
                <span className="menu-status-link-label">games</span>
                <a
                  className="menu-status-link"
                  href="https://downforeveryoneorjustme.com/api.thegamesdb.net"
                  target="_blank"
                  rel="noreferrer"
                >
                  api.thegamesdb.net
                </a>
              </li>
              <li>
                <span className="menu-status-link-label">movies/tv</span>
                <a
                  className="menu-status-link"
                  href="https://downforeveryoneorjustme.com/api.themoviedb.org"
                  target="_blank"
                  rel="noreferrer"
                >
                  api.themoviedb.org
                </a>
              </li>
              <li>
                <span className="menu-status-link-label">music</span>
                <a
                  className="menu-status-link"
                  href="https://downforeveryoneorjustme.com/musicbrainz.org"
                  target="_blank"
                  rel="noreferrer"
                >
                  musicbrainz.org
                </a>
              </li>
              <li>
                <span className="menu-status-link-label">books</span>
                <a
                  className="menu-status-link"
                  href="https://downforeveryoneorjustme.com/openlibrary.org"
                  target="_blank"
                  rel="noreferrer"
                >
                  openlibrary.org
                </a>
              </li>
            </ul>
          </details>

          <div className="menu-about menu-grid-config-section">
            <div className="grid-config-header">
              <h3>About</h3>
              {showResetConfirm ? (
                <div className="reset-confirmation" ref={confirmRef}>
                  <span>Clear all data:</span>
                  <button
                    type="button"
                    className="reset-confirm-yes"
                    onClick={() => {
                      onClearGrid();
                      setShowResetConfirm(false);
                      logger.info('MENU: Grid cleared', {
                        context: 'Menu.handleResetConfirm',
                        action: 'grid_clear',
                        timestamp: Date.now(),
                      });
                    }}
                  >
                    yes
                  </button>
                  <button
                    type="button"
                    className="reset-confirm-no"
                    onClick={() => setShowResetConfirm(false)}
                  >
                    no
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="reset-button"
                  onClick={() => setShowResetConfirm(true)}
                  aria-label="Clear all data"
                >
                  reset
                </button>
              )}
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
