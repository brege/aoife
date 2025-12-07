import React from 'react';
import './app-header.css';
import './editable-title.css';
import EditableTitle from './editable-title';
import HamburgerMenu from '../menu/hamburger-menu';
import { MediaType } from '../../types/media';
import { GridLayoutMode } from '../grid-2x2';

interface AppHeaderProps {
  selectedMediaType: MediaType;
  onMediaTypeChange: (type: MediaType) => void;
  onClearGrid: () => void;
  gridLayoutMode: GridLayoutMode;
  onGridLayoutModeChange: (mode: GridLayoutMode) => void;
  fitToScreen: boolean;
  onFitToScreenChange: (enabled: boolean) => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ 
  selectedMediaType, 
  onMediaTypeChange, 
  onClearGrid,
  gridLayoutMode,
  onGridLayoutModeChange,
  fitToScreen,
  onFitToScreenChange
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
          gridLayoutMode={gridLayoutMode}
          onGridLayoutModeChange={onGridLayoutModeChange}
          fitToScreen={fitToScreen}
          onFitToScreenChange={onFitToScreenChange}
        />
      </div>
    </div>
  );
};

export default AppHeader;