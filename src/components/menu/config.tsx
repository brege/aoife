import type React from 'react';
import logger from '../../lib/logger';

interface MenuConfigProps {
  onMenuClose: () => void;
  columns: number;
  onColumnsChange: (columns: number) => void;
  minRows: number;
  onMinRowsChange: (minRows: number) => void;
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
  );
};

export default MenuConfig;
