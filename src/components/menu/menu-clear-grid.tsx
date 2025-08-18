import React from 'react';
import logger from '../../utils/logger';

interface MenuClearGridProps {
  onClearGrid: () => void;
  onMenuClose: () => void;
}

const MenuClearGrid: React.FC<MenuClearGridProps> = ({ onClearGrid, onMenuClose }) => {
  const handleClear = () => {
    onClearGrid();
    onMenuClose();
    logger.info('Grid cleared via menu clear component', {
      context: 'MenuClearGrid.handleClear',
      action: 'clear_grid_component'
    });
  };

  return (
    <div className="menu-clear-section">
      <button 
        className="menu-option danger"
        onClick={handleClear}
      >
        Clear Grid
      </button>
    </div>
  );
};

export default MenuClearGrid;