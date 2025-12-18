import type React from 'react';
import { GrAdd } from 'react-icons/gr';
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
  coverViewMode?: 'grid' | 'carousel';
  onCoverViewModeChange?: (mode: 'grid' | 'carousel') => void;
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
  coverViewMode,
  onCoverViewModeChange,
}) => {
  const handleAddToggle = () => {
    onBuilderModeToggle(!isBuilderMode);
  };

  return (
    <div className="app-header">
      <div className="header-left">
        <EditableTitle title={title} onTitleChange={onTitleChange} />
      </div>

      <div className="header-right">
        <button
          type="button"
          className={`header-add-button${isBuilderMode ? ' active' : ''}`}
          onClick={handleAddToggle}
          aria-label={isBuilderMode ? 'Show grid' : 'Show editor'}
          title={isBuilderMode ? 'Show grid' : 'Add item'}
        >
          <GrAdd size={20} />
        </button>

        <Menu
          onClearGrid={onClearGrid}
          columns={columns}
          onColumnsChange={onColumnsChange}
          minRows={minRows}
          onMinRowsChange={onMinRowsChange}
          layoutDimension={layoutDimension}
          onLayoutDimensionChange={onLayoutDimensionChange}
          onShare={onShare}
          isSharing={isSharing}
          shareUrl={shareUrl}
          shareError={shareError}
          isLoadingShare={isLoadingShare}
          coverViewMode={coverViewMode}
          onCoverViewModeChange={onCoverViewModeChange}
        />
      </div>
    </div>
  );
};

export default AppHeader;
