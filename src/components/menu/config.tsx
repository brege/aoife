import { Switch } from '@headlessui/react';
import type React from 'react';
import logger from '../../lib/logger';

interface MenuConfigProps {
  onMenuClose: () => void;
  columns: number;
  onColumnsChange: (columns: number) => void;
  minRows: number;
  onMinRowsChange: (minRows: number) => void;
  layoutDimension: 'width' | 'height';
  onLayoutDimensionChange: (dimension: 'width' | 'height') => void;
  bandPlacementMode: 'alwaysTop' | 'adaptive';
  onBandPlacementModeChange: (mode: 'alwaysTop' | 'adaptive') => void;
  captionMode: 'hidden' | 'overlay';
  onCaptionModeChange: (mode: 'hidden' | 'overlay') => void;
  coverViewMode?: 'grid' | 'carousel';
  onCoverViewModeChange?: (mode: 'grid' | 'carousel') => void;
}

const MIN_COLUMNS = 1;
const MAX_COLUMNS = 8;
const MIN_ROWS_VALUE = 1;
const MAX_ROWS_VALUE = 6;

const MenuConfig: React.FC<MenuConfigProps> = ({
  columns,
  onColumnsChange,
  minRows,
  onMinRowsChange,
  layoutDimension,
  onLayoutDimensionChange,
  bandPlacementMode,
  onBandPlacementModeChange,
  captionMode,
  onCaptionModeChange,
  coverViewMode = 'grid',
  onCoverViewModeChange,
}) => {
  const handleColumnsDecrement = () => {
    if (columns <= MIN_COLUMNS) return;
    const nextValue = columns - 1;
    logger.info(`MENU: Columns decreased to ${nextValue}`, {
      context: 'MenuConfig.handleColumnsDecrement',
      action: 'columns_change',
      previousValue: columns,
      newValue: nextValue,
      timestamp: Date.now(),
    });
    onColumnsChange(nextValue);
  };

  const handleColumnsIncrement = () => {
    if (columns >= MAX_COLUMNS) return;
    const nextValue = columns + 1;
    logger.info(`MENU: Columns increased to ${nextValue}`, {
      context: 'MenuConfig.handleColumnsIncrement',
      action: 'columns_change',
      previousValue: columns,
      newValue: nextValue,
      timestamp: Date.now(),
    });
    onColumnsChange(nextValue);
  };

  const handleRowsDecrement = () => {
    if (minRows <= MIN_ROWS_VALUE) return;
    const nextValue = minRows - 1;
    logger.info(`MENU: Min rows decreased to ${nextValue}`, {
      context: 'MenuConfig.handleRowsDecrement',
      action: 'min_rows_change',
      previousValue: minRows,
      newValue: nextValue,
      timestamp: Date.now(),
    });
    onMinRowsChange(nextValue);
  };

  const handleRowsIncrement = () => {
    if (minRows >= MAX_ROWS_VALUE) return;
    const nextValue = minRows + 1;
    logger.info(`MENU: Min rows increased to ${nextValue}`, {
      context: 'MenuConfig.handleRowsIncrement',
      action: 'min_rows_change',
      previousValue: minRows,
      newValue: nextValue,
      timestamp: Date.now(),
    });
    onMinRowsChange(nextValue);
  };

  return (
    <div className="menu-grid-config-section">
      <div className="grid-config-header">
        <h3>Layout</h3>
      </div>

      <div className="config-row four-col">
        <span className="config-label">titles per row</span>
        <div className="column-stepper">
          <button
            type="button"
            className="stepper-button"
            onClick={handleColumnsDecrement}
            disabled={columns <= MIN_COLUMNS}
            aria-label="Decrease columns"
          >
            -
          </button>
          <span className="stepper-value">{columns}</span>
          <button
            type="button"
            className="stepper-button"
            onClick={handleColumnsIncrement}
            disabled={columns >= MAX_COLUMNS}
            aria-label="Increase columns"
          >
            +
          </button>
        </div>
      </div>

      <div className="config-row four-col">
        <span className="config-label">minimum rows</span>
        <div className="column-stepper">
          <button
            type="button"
            className="stepper-button"
            onClick={handleRowsDecrement}
            disabled={minRows <= MIN_ROWS_VALUE}
            aria-label="Decrease minimum rows"
          >
            -
          </button>
          <span className="stepper-value">{minRows}</span>
          <button
            type="button"
            className="stepper-button"
            onClick={handleRowsIncrement}
            disabled={minRows >= MAX_ROWS_VALUE}
            aria-label="Increase minimum rows"
          >
            +
          </button>
        </div>
      </div>

      <div className="config-row four-col">
        <span className="config-label">fixed width</span>
        <span className="config-spacer" aria-hidden="true" />
        <Switch
          checked={layoutDimension === 'width'}
          onChange={(checked) =>
            onLayoutDimensionChange(checked ? 'width' : 'height')
          }
          className="layout-dimension-toggle"
        />
        <span className="config-spacer" aria-hidden="true" />
      </div>

      <div className="config-row four-col">
        <span className="config-label">captions</span>
        <span className="config-spacer" aria-hidden="true" />
        <Switch
          checked={captionMode === 'overlay'}
          onChange={(checked) =>
            onCaptionModeChange(checked ? 'overlay' : 'hidden')
          }
          className="layout-dimension-toggle"
        />
        <span className="config-spacer" aria-hidden="true" />
      </div>

      <div className="config-row search-band-toggle-row">
        <span className="config-label">Search</span>
        <span className="search-band-label">Always on top</span>
        <Switch
          checked={bandPlacementMode === 'adaptive'}
          onChange={(checked) =>
            onBandPlacementModeChange(checked ? 'adaptive' : 'alwaysTop')
          }
          className="layout-dimension-toggle"
        />
        <span className="search-band-label">Auto</span>
      </div>

      <div className="config-row four-col cover-view-toggle-row">
        <span className="config-label">swipe mode</span>
        <span className="config-spacer" aria-hidden="true" />
        <Switch
          checked={coverViewMode === 'carousel'}
          onChange={(checked) => {
            const newMode = checked ? 'carousel' : 'grid';
            onCoverViewModeChange?.(newMode);
            logger.info(`MENU: Swipe mode changed to ${newMode}`, {
              context: 'MenuConfig.swipeMode',
              action: 'swipe_mode_change',
              newMode,
              timestamp: Date.now(),
            });
          }}
          className="cover-view-toggle"
        />
        <span className="config-spacer" aria-hidden="true" />
      </div>
    </div>
  );
};

export default MenuConfig;
