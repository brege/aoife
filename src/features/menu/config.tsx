import { Switch } from '@headlessui/react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';
import logger from '../../lib/logger';

const LAYOUT_SECTION_OPEN_KEY = 'layout-section-open';

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
  captionMode: 'hidden' | 'top' | 'bottom';
  onCaptionModeChange: (mode: 'hidden' | 'top' | 'bottom') => void;
  captionEditsOnly: boolean;
  onCaptionEditsOnlyChange: (value: boolean) => void;
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
  captionEditsOnly,
  onCaptionEditsOnlyChange,
  coverViewMode = 'grid',
  onCoverViewModeChange,
}) => {
  const [isLayoutSectionOpen, setIsLayoutSectionOpen] = useState(() => {
    const stored = localStorage.getItem(LAYOUT_SECTION_OPEN_KEY);
    return stored ? stored === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem(LAYOUT_SECTION_OPEN_KEY, String(isLayoutSectionOpen));
  }, [isLayoutSectionOpen]);

  const handleColumnsDecrement = () => {
    if (columns <= MIN_COLUMNS) return;
    const nextValue = columns - 1;
    logger.info(
      {
        context: 'MenuConfig.handleColumnsDecrement',
        action: 'columns_change',
        previousValue: columns,
        newValue: nextValue,
        timestamp: Date.now(),
      },
      `MENU: Columns decreased to ${nextValue}`,
    );
    onColumnsChange(nextValue);
  };

  const handleColumnsIncrement = () => {
    if (columns >= MAX_COLUMNS) return;
    const nextValue = columns + 1;
    logger.info(
      {
        context: 'MenuConfig.handleColumnsIncrement',
        action: 'columns_change',
        previousValue: columns,
        newValue: nextValue,
        timestamp: Date.now(),
      },
      `MENU: Columns increased to ${nextValue}`,
    );
    onColumnsChange(nextValue);
  };

  const handleRowsDecrement = () => {
    if (minRows <= MIN_ROWS_VALUE) return;
    const nextValue = minRows - 1;
    logger.info(
      {
        context: 'MenuConfig.handleRowsDecrement',
        action: 'min_rows_change',
        previousValue: minRows,
        newValue: nextValue,
        timestamp: Date.now(),
      },
      `MENU: Min rows decreased to ${nextValue}`,
    );
    onMinRowsChange(nextValue);
  };

  const handleRowsIncrement = () => {
    if (minRows >= MAX_ROWS_VALUE) return;
    const nextValue = minRows + 1;
    logger.info(
      {
        context: 'MenuConfig.handleRowsIncrement',
        action: 'min_rows_change',
        previousValue: minRows,
        newValue: nextValue,
        timestamp: Date.now(),
      },
      `MENU: Min rows increased to ${nextValue}`,
    );
    onMinRowsChange(nextValue);
  };

  return (
    <details
      className="menu-status menu-grid-config-section"
      open={isLayoutSectionOpen}
      onToggle={(e) => {
        setIsLayoutSectionOpen((e.target as HTMLDetailsElement).open);
      }}
    >
      <summary className="menu-status-summary">
        <span className="menu-status-summary-label">
          <span>Layout</span>
          <FaChevronRight
            className="menu-status-chevron menu-status-chevron-right"
            aria-hidden="true"
            focusable="false"
          />
          <FaChevronDown
            className="menu-status-chevron menu-status-chevron-down"
            aria-hidden="true"
            focusable="false"
          />
        </span>
      </summary>

      <div className="config-group">
        <div className="config-group-title">Grid</div>
        <div className="config-row">
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

        <div className="config-row">
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
      </div>

      <div className="config-group">
        <div className="config-group-title">Behavior</div>
        <div className="config-row">
          <span className="config-label">fixed width</span>
          <Switch
            checked={layoutDimension === 'width'}
            onChange={(checked) =>
              onLayoutDimensionChange(checked ? 'width' : 'height')
            }
            className="layout-dimension-toggle"
          />
        </div>

        <div className="config-row">
          <span className="config-label">swipe mode</span>
          <Switch
            checked={coverViewMode === 'carousel'}
            onChange={(checked) => {
              const newMode = checked ? 'carousel' : 'grid';
              onCoverViewModeChange?.(newMode);
              logger.info(
                {
                  context: 'MenuConfig.swipeMode',
                  action: 'swipe_mode_change',
                  newMode,
                  timestamp: Date.now(),
                },
                `MENU: Swipe mode changed to ${newMode}`,
              );
            }}
            className="cover-view-toggle"
          />
        </div>
      </div>

      <div className="config-group">
        <div className="config-group-title">Captions</div>
        <div className="config-row">
          <span className="config-label">position</span>
          <fieldset className="segmented-control" aria-label="Caption position">
            <label className="segmented-option">
              <input
                type="radio"
                name="caption-position"
                value="hidden"
                checked={captionMode === 'hidden'}
                onChange={() => onCaptionModeChange('hidden')}
                className="segmented-input"
              />
              <span className="segmented-button">off</span>
            </label>
            <label className="segmented-option">
              <input
                type="radio"
                name="caption-position"
                value="top"
                checked={captionMode === 'top'}
                onChange={() => onCaptionModeChange('top')}
                className="segmented-input"
              />
              <span className="segmented-button">top</span>
            </label>
            <label className="segmented-option">
              <input
                type="radio"
                name="caption-position"
                value="bottom"
                checked={captionMode === 'bottom'}
                onChange={() => onCaptionModeChange('bottom')}
                className="segmented-input"
              />
              <span className="segmented-button">bottom</span>
            </label>
          </fieldset>
        </div>

        <div className="config-row">
          <span className="config-label">edits only</span>
          <Switch
            checked={captionEditsOnly}
            onChange={onCaptionEditsOnlyChange}
            className="caption-edits-toggle"
          />
        </div>
      </div>

      <div className="config-group">
        <div className="config-group-title">Search band</div>
        <div className="config-row">
          <span className="config-label">placement</span>
          <fieldset
            className="segmented-control"
            aria-label="Search band placement"
          >
            <label className="segmented-option">
              <input
                type="radio"
                name="search-band-placement"
                value="alwaysTop"
                checked={bandPlacementMode === 'alwaysTop'}
                onChange={() => onBandPlacementModeChange('alwaysTop')}
                className="segmented-input"
              />
              <span className="segmented-button">always on top</span>
            </label>
            <label className="segmented-option">
              <input
                type="radio"
                name="search-band-placement"
                value="adaptive"
                checked={bandPlacementMode === 'adaptive'}
                onChange={() => onBandPlacementModeChange('adaptive')}
                className="segmented-input"
              />
              <span className="segmented-button">auto</span>
            </label>
          </fieldset>
        </div>
      </div>
    </details>
  );
};

export default MenuConfig;
