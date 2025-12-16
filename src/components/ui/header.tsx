import type React from 'react';
import './header.css';
import './title.css';
import Menu from '../menu/menu';
import EditableTitle from './title';

interface AppHeaderProps {
  onClearGrid: () => void;
  columns: number;
  onColumnsChange: (columns: number) => void;
  minRows: number;
  onMinRowsChange: (minRows: number) => void;
  isBuilderMode: boolean;
  onBuilderModeToggle: (enabled: boolean) => void;
  layoutDimension: 'width' | 'height';
  onLayoutDimensionChange: (dimension: 'width' | 'height') => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  onClearGrid,
  columns,
  onColumnsChange,
  minRows,
  onMinRowsChange,
  isBuilderMode,
  onBuilderModeToggle,
  layoutDimension,
  onLayoutDimensionChange,
}) => {
  return (
    <div className="app-header">
      <div className="header-left">
        <EditableTitle />
      </div>

      <div className="header-right">
        <Menu
          onClearGrid={onClearGrid}
          columns={columns}
          onColumnsChange={onColumnsChange}
          minRows={minRows}
          onMinRowsChange={onMinRowsChange}
          isBuilderMode={isBuilderMode}
          onBuilderModeToggle={onBuilderModeToggle}
          layoutDimension={layoutDimension}
          onLayoutDimensionChange={onLayoutDimensionChange}
        />
      </div>
    </div>
  );
};

export default AppHeader;
