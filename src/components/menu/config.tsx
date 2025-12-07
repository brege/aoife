import type React from 'react';
import logger from '../../logger';
import type { GridLayoutMode } from '../grid';

interface MenuConfigProps {
  onMenuClose: () => void;
  layoutMode: GridLayoutMode;
  onLayoutModeChange: (mode: GridLayoutMode) => void;
  fitToScreen: boolean;
  onFitToScreenChange: (enabled: boolean) => void;
}

const MenuConfig: React.FC<MenuConfigProps> = ({
  onMenuClose,
  layoutMode,
  onLayoutModeChange,
  fitToScreen,
  onFitToScreenChange,
}) => {
  const handleLayoutModeChange = (mode: GridLayoutMode) => {
    logger.info(`MENU: Grid layout mode changed to "${mode}"`, {
      context: 'MenuGridConfig.handleLayoutModeChange',
      action: 'grid_layout_mode_change',
      previousMode: layoutMode,
      newMode: mode,
      timestamp: Date.now(),
    });

    onLayoutModeChange(mode);
    onMenuClose();
  };

  const handleFitToScreenToggle = () => {
    const newValue = !fitToScreen;
    logger.info(`MENU: Fit to screen ${newValue ? 'enabled' : 'disabled'}`, {
      context: 'MenuGridConfig.handleFitToScreenToggle',
      action: 'fit_to_screen_toggle',
      previousValue: fitToScreen,
      newValue: newValue,
      timestamp: Date.now(),
    });

    onFitToScreenChange(newValue);
  };

  const layoutModes: {
    value: GridLayoutMode;
    label: string;
    description: string;
  }[] = [
    {
      value: 'auto',
      label: 'Auto Layout',
      description: 'Adaptive layouts: 1x1 → 1x2 → center 2x2',
    },
    {
      value: 'force-2x2',
      label: 'Force 2x2',
      description: 'Always use 2x2 grid regardless of count',
    },
    {
      value: 'prefer-horizontal',
      label: 'Prefer Horizontal',
      description: 'Favor horizontal layouts when possible',
    },
    {
      value: 'vertical-stack',
      label: 'Vertical Stack',
      description: 'Single column vertical arrangement',
    },
  ];

  return (
    <div className="menu-grid-config-section">
      <div className="grid-config-header">
        <h3>Grid Layout</h3>
        <div className="current-mode">
          Current: {layoutModes.find((m) => m.value === layoutMode)?.label}
        </div>
      </div>

      {/* Fit to Screen Toggle */}
      <button
        type="button"
        className={`menu-option fit-to-screen-toggle ${fitToScreen ? 'active' : ''}`}
        onClick={handleFitToScreenToggle}
        title="Scale posters to fit screen width (enabled by default)"
      >
        <div className="layout-option-content">
          <span className="layout-name">Fit to Screen</span>
          <span className="layout-description">
            {fitToScreen
              ? 'Enabled - Posters scale to fit screen'
              : 'Disabled - Fixed poster sizes'}
          </span>
        </div>
      </button>

      {/* Layout Mode Options */}
      {layoutModes.map((mode) => (
        <button
          type="button"
          key={mode.value}
          className={`menu-option grid-layout-option ${layoutMode === mode.value ? 'active' : ''}`}
          onClick={() => handleLayoutModeChange(mode.value)}
          title={mode.description}
        >
          <div className="layout-option-content">
            <span className="layout-name">{mode.label}</span>
            <span className="layout-description">{mode.description}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default MenuConfig;
