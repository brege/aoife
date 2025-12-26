import type React from 'react';
import { GrAdd } from 'react-icons/gr';
import './header.css';
import './title.css';
import Menu from '../features/menu/menu';
import EditableTitle from './title';

interface AppHeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  onClearGrid: () => void;
  columns: number;
  onColumnsChange: (columns: number) => void;
  minRows: number;
  onMinRowsChange: (minRows: number) => void;
  showSearch: boolean;
  onShowSearchToggle: (enabled: boolean) => void;
  layoutDimension: 'height' | 'chimney';
  onLayoutDimensionChange: (dimension: 'height' | 'chimney') => void;
  bandPlacementMode: 'alwaysTop' | 'adaptive';
  onBandPlacementModeChange: (mode: 'alwaysTop' | 'adaptive') => void;
  captionMode: 'hidden' | 'top' | 'bottom';
  onCaptionModeChange: (mode: 'hidden' | 'top' | 'bottom') => void;
  captionEditsOnly: boolean;
  onCaptionEditsOnlyChange: (value: boolean) => void;
  onShare: () => void;
  isSharing: boolean;
  shareUrl: string;
  shareError: string;
  isLoadingShare: boolean;
  coverViewMode: 'grid' | 'carousel';
  onCoverViewModeChange: (mode: 'grid' | 'carousel') => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  onTitleChange,
  onClearGrid,
  columns,
  onColumnsChange,
  minRows,
  onMinRowsChange,
  showSearch,
  onShowSearchToggle,
  layoutDimension,
  onLayoutDimensionChange,
  bandPlacementMode,
  onBandPlacementModeChange,
  captionMode,
  onCaptionModeChange,
  captionEditsOnly,
  onCaptionEditsOnlyChange,
  onShare,
  isSharing,
  shareUrl,
  shareError,
  isLoadingShare,
  coverViewMode,
  onCoverViewModeChange,
}) => {
  const handleAddToggle = () => {
    onShowSearchToggle(!showSearch);
  };

  return (
    <div className="app-header">
      <div className="header-left">
        <EditableTitle title={title} onTitleChange={onTitleChange} />
      </div>

      <div className="header-right">
        <button
          type="button"
          className={`header-add-button${showSearch ? ' active' : ''}`}
          onClick={handleAddToggle}
          aria-label={showSearch ? 'Hide search' : 'Show search'}
          aria-pressed={showSearch}
          title={showSearch ? 'Hide search' : 'Show search'}
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
          bandPlacementMode={bandPlacementMode}
          onBandPlacementModeChange={onBandPlacementModeChange}
          captionMode={captionMode}
          onCaptionModeChange={onCaptionModeChange}
          captionEditsOnly={captionEditsOnly}
          onCaptionEditsOnlyChange={onCaptionEditsOnlyChange}
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
