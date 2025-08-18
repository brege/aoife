import React from 'react';
import { MediaType } from '../../types/media';
import logger from '../../utils/logger';

interface MenuMediaTypeProps {
  selectedMediaType: MediaType;
  onMediaTypeChange: (type: MediaType) => void;
  onMenuClose: () => void;
}

const MenuMediaType: React.FC<MenuMediaTypeProps> = ({ 
  selectedMediaType, 
  onMediaTypeChange, 
  onMenuClose 
}) => {
  const handleMediaTypeSelect = (type: MediaType) => {
    logger.info(`MENU: Media type changed to "${type}"`, {
      context: 'MenuMediaType.handleMediaTypeSelect',
      action: 'media_type_change_menu',
      previousType: selectedMediaType,
      newType: type,
      timestamp: Date.now()
    });
    
    onMediaTypeChange(type);
    onMenuClose();
  };

  return (
    <div className="menu-media-type-section">
      <div className="media-type-current">
        Current: {selectedMediaType.charAt(0).toUpperCase() + selectedMediaType.slice(1)}
      </div>
      {(['movies', 'books', 'music'] as MediaType[]).map((type) => (
        <button
          key={type}
          className={`menu-option ${selectedMediaType === type ? 'active' : ''}`}
          onClick={() => handleMediaTypeSelect(type)}
        >
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </button>
      ))}
    </div>
  );
};

export default MenuMediaType;