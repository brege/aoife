import type React from 'react';
import './header.css';
import './title.css';
import type { GridLayoutMode } from '../grid/grid';
import Menu from '../menu/menu';
import EditableTitle from './title';

interface AppHeaderProps {
  onClearGrid: () => void;
  gridLayoutMode: GridLayoutMode;
  onGridLayoutModeChange: (mode: GridLayoutMode) => void;
  fitToScreen: boolean;
  onFitToScreenChange: (enabled: boolean) => void;
  isBuilderMode: boolean;
  onBuilderModeToggle: (enabled: boolean) => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  onClearGrid,
  gridLayoutMode,
  onGridLayoutModeChange,
  fitToScreen,
  onFitToScreenChange,
  isBuilderMode,
  onBuilderModeToggle,
}) => {
  return (
    <div className="app-header">
      <div className="header-left">
        <EditableTitle />
      </div>

      <div className="header-right">
        <Menu
          onClearGrid={onClearGrid}
          gridLayoutMode={gridLayoutMode}
          onGridLayoutModeChange={onGridLayoutModeChange}
          fitToScreen={fitToScreen}
          onFitToScreenChange={onFitToScreenChange}
          isBuilderMode={isBuilderMode}
          onBuilderModeToggle={onBuilderModeToggle}
        />
      </div>
    </div>
  );
};

export default AppHeader;
