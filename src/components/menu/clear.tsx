import type React from 'react';
import logger from '../../lib/logger';

interface MenuClearProps {
  onClearGrid: () => void;
  onMenuClose: () => void;
}

const MenuClear: React.FC<MenuClearProps> = ({ onClearGrid, onMenuClose }) => {
  const handleClear = () => {
    onClearGrid();
    onMenuClose();
    logger.info('Grid cleared via menu clear component', {
      context: 'MenuClearGrid.handleClear',
      action: 'clear_grid_component',
    });
  };

  return (
    <button
      type="button"
      className="menu-icon-button danger"
      onClick={handleClear}
      aria-label="Clear grid"
      title="Clear grid"
    >
      <TrashIcon />
    </button>
  );
};

const TrashIcon: React.FC = () => (
  <svg
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    role="img"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M4 7h16" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" />
    <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
  </svg>
);

export default MenuClear;
