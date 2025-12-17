import type React from 'react';
import './header.css';
import './title.css';
import Menu from '../menu/menu';
import EditableTitle from './title';

interface AppHeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  onClearGrid: () => void;
  columns: number;
  onColumnsChange: (columns: number) => void;
  minRows: number;
  onMinRowsChange: (minRows: number) => void;
  isBuilderMode: boolean;
  onBuilderModeToggle: (enabled: boolean) => void;
  layoutDimension: 'width' | 'height';
  onLayoutDimensionChange: (dimension: 'width' | 'height') => void;
  onShare: () => void;
  isSharing: boolean;
  shareUrl: string;
  shareError: string;
  isLoadingShare: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  onTitleChange,
  onClearGrid,
  columns,
  onColumnsChange,
  minRows,
  onMinRowsChange,
  isBuilderMode,
  onBuilderModeToggle,
  layoutDimension,
  onLayoutDimensionChange,
  onShare,
  isSharing,
  shareUrl,
  shareError,
  isLoadingShare,
}) => {
  return (
    <div className="app-header">
      <div className="header-left">
        <EditableTitle title={title} onTitleChange={onTitleChange} />
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
          onShare={onShare}
          isSharing={isSharing}
          shareUrl={shareUrl}
          shareError={shareError}
          isLoadingShare={isLoadingShare}
        />
      </div>
    </div>
  );
};

export default AppHeader;
