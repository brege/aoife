import React from 'react';
import './header.css';
import './title.css';
import EditableTitle from './title';
import Menu from './menu/menu';
import { MediaType } from '../media/types';
import { GridLayoutMode } from './grid';

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
        <Menu
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
