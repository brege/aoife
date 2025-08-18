import React from 'react';
import './app-header.css';
import './editable-title.css';
import EditableTitle from './editable-title';
import HamburgerMenu from '../menu/hamburger-menu';
import { MediaType } from '../../types/media';

interface AppHeaderProps {
  selectedMediaType: MediaType;
  onMediaTypeChange: (type: MediaType) => void;
  onClearGrid: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ 
  selectedMediaType, 
  onMediaTypeChange, 
  onClearGrid 
}) => {
  return (
    <div className="app-header">
      <div className="header-left">
        <EditableTitle />
      </div>
      
      <div className="header-right">
        <HamburgerMenu
          selectedMediaType={selectedMediaType}
          onMediaTypeChange={onMediaTypeChange}
          onClearGrid={onClearGrid}
        />
      </div>
    </div>
  );
};

export default AppHeader;