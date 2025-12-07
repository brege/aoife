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
    <div className="menu-clear-section">
      <button
        type="button"
        className="menu-option danger"
        onClick={handleClear}
      >
        Clear Grid
      </button>
    </div>
  );
};

export default MenuClear;
