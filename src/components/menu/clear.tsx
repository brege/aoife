import type React from 'react';
import { PiTrash } from 'react-icons/pi';
import logger from '../../lib/logger';

interface MenuClearProps {
  onClearGrid: () => void;
  onMenuClose: () => void;
}

const MenuClear: React.FC<MenuClearProps> = ({ onClearGrid, onMenuClose }) => {
  const handleClear = () => {
    if (!window.confirm('Are you sure you want to clear the grid?')) {
      return;
    }
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
      <PiTrash size={20} />
    </button>
  );
};

export default MenuClear;
