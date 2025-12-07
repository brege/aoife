import React, { useRef } from 'react';
import './grid.css';
import CloseIcon from './close';
import { MediaItem } from '../types/media';
import logger from '../utils/logger';

export type GridLayoutMode = 'auto' | 'force-2x2' | 'prefer-horizontal' | 'vertical-stack';

interface Grid2x2Props {
  items: MediaItem[];
  onRemoveMedia: (mediaId: string | number) => void;
  onPosterClick: (media: MediaItem) => void;
  showPosterGrid: boolean;
  alternatePosterUrls: string[];
  onSelectAlternatePoster: (url: string) => void;
  onClosePosterGrid: () => void;
  onPlaceholderClick: () => void;
  layoutMode?: GridLayoutMode;
  fitToScreen?: boolean;
  placeholderLabel: string;
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

const getCoverSrc = (media: MediaItem) => {
  if (media.coverUrl) return media.coverUrl;
  if (media.coverThumbnailUrl) return media.coverThumbnailUrl;
  const posterPath = typeof media.metadata?.poster_path === 'string' ? media.metadata?.poster_path : undefined;
  return posterPath ? `${TMDB_IMAGE_BASE}/w300${posterPath}` : '';
};

const Grid2x2: React.FC<Grid2x2Props> = ({
  items,
  onRemoveMedia,
  onPosterClick,
  showPosterGrid,
  alternatePosterUrls,
  onSelectAlternatePoster,
  onClosePosterGrid,
  onPlaceholderClick,
  layoutMode = 'auto',
  fitToScreen = true,
  placeholderLabel,
}) => {
  const itemCount = items.length;
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const getLayoutClass = () => {
    switch (layoutMode) {
      case 'force-2x2':
        return 'layout-force-2x2';
      case 'prefer-horizontal':
        return 'layout-prefer-horizontal';
      case 'vertical-stack':
        return 'layout-vertical-stack';
      case 'auto':
      default:
        return `layout-${Math.min(itemCount, 4)}`;
    }
  };

  const layoutClass = getLayoutClass();
  const containerClass = `grid-container ${layoutClass}${fitToScreen ? ' fit-to-screen' : ''}`;

  React.useEffect(() => {
    if (!gridContainerRef.current) {
      return;
    }

    const container = gridContainerRef.current;
    const rect = container.getBoundingClientRect();
    const styles = getComputedStyle(container);

    const debugInfo = {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        userAgent: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'
      },
      container: {
        dimensions: {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          left: Math.round(rect.left),
          top: Math.round(rect.top)
        },
        computedStyles: {
          display: styles.display,
          gridTemplateColumns: styles.gridTemplateColumns,
          gridTemplateRows: styles.gridTemplateRows,
          gap: styles.gap,
          justifyContent: styles.justifyContent,
          alignContent: styles.alignContent,
          width: styles.width,
          maxWidth: styles.maxWidth,
          padding: styles.padding,
          margin: styles.margin
        },
        cssClasses: containerClass.split(' ')
      },
      layout: {
        mode: layoutMode,
        class: layoutClass,
        fitToScreen: fitToScreen,
        movieCount: itemCount,
        positions: getPositionsToRender()
      },
      matrix: {
        rendered: getPositionsToRender().map(pos => ({
          position: pos,
          row: Math.floor(pos / 2),
          col: pos % 2,
          hasMedia: !!items[pos],
          mediaTitle: items[pos]?.title || 'placeholder'
        }))
      }
    };

    logger.info(`GRID-DEBUG: Layout state captured`, {
      context: 'Grid2x2.layoutDebug',
      action: 'layout_state_capture',
      debugInfo,
      timestamp: Date.now()
    });

    (window as any).gridDebugInfo = debugInfo;
  }, [layoutMode, fitToScreen, itemCount, items, containerClass]);

  const renderGridItem = (position: number) => {
    const item = items[position];

    if (item) {
      return (
        <div key={item.id} className="grid-item filled">
          <div className="poster-wrapper">
            <img
              src={getCoverSrc(item) || ''}
              alt={`${item.title} cover`}
              className="grid-poster"
              title={`${item.title}${item.year ? ` (${item.year})` : ''}`}
              onClick={() => onPosterClick(item)}
              onLoad={(e) => {
                const img = e.target as HTMLImageElement;
                setTimeout(() => {
                  const rect = img.getBoundingClientRect();
                  const itemElement = img.closest('.grid-item') as HTMLElement;
                  const itemRect = itemElement?.getBoundingClientRect();
                  const itemStyles = itemElement ? getComputedStyle(itemElement) : null;

                  const dimensions = {
                    displayWidth: Math.round(rect.width),
                    displayHeight: Math.round(rect.height),
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                    aspectRatio: (rect.width / rect.height).toFixed(2)
                  };

                  const itemInfo = itemRect && itemStyles ? {
                    itemWidth: Math.round(itemRect.width),
                    itemHeight: Math.round(itemRect.height),
                    itemComputedWidth: itemStyles.width,
                    itemMinWidth: itemStyles.minWidth,
                    itemMaxWidth: itemStyles.maxWidth
                  } : {};

                  const viewportWidth = window.innerWidth;
                  const availableWidth = viewportWidth - 32;
                  const optimalSingleWidth = Math.min(200, availableWidth * 0.8);
                  const optimalTwoColumnWidth = Math.min(164, (availableWidth - 16) / 2);

                  const analysis = {
                    viewport: viewportWidth,
                    available: availableWidth,
                    optimalSingle: optimalSingleWidth,
                    optimalTwoColumn: optimalTwoColumnWidth,
                    actualPoster: dimensions.displayWidth,
                    actualItem: itemInfo.itemWidth,
                    efficiency: itemInfo.itemWidth ? (dimensions.displayWidth / itemInfo.itemWidth * 100).toFixed(1) + '%' : 'N/A'
                  };

                  logger.info(`GRID: Poster loaded at position ${position} - ${dimensions.displayWidth}x${dimensions.displayHeight}`, {
                    context: 'Grid2x2.posterLoad',
                    action: 'poster_dimensions',
                    media: { id: item.id, title: item.title },
                    position,
                    dimensions,
                    itemInfo,
                    analysis,
                    gridPosition: `(${Math.floor(position / 2)}, ${position % 2})`,
                    timestamp: Date.now()
                  });
                }, 50);
              }}
            />
            <button
              className="close-button"
              onClick={() => {
                logger.info(`GRID: Removed "${item.title}" from position ${position}`, {
                  context: 'Grid2x2.onRemoveMedia',
                  action: 'grid_remove_media',
                  mediaId: item.id,
                  position,
                  timestamp: Date.now()
                });
                onRemoveMedia(item.id);
              }}
              aria-label={`Remove ${item.title}`}
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={`placeholder-${position}`}
        className="grid-item empty"
        onClick={onPlaceholderClick}
        title={`Add a ${placeholderLabel}`}
      >
        <div className="placeholder-content">
          <span>+</span>
        </div>
      </div>
    );
  };

  const getPositionsToRender = () => {
    if (itemCount === 0) return [0];
    if (itemCount === 1) return [0, 1];
    if (itemCount === 2) return [0, 1, 2];
    if (itemCount === 3) return [0, 1, 2, 3];
    return [0, 1, 2, 3];
  };

  return (
    <div className="grid-2x2">
      <div ref={gridContainerRef} className={containerClass}>
        {getPositionsToRender().map(position => renderGridItem(position))}
      </div>

      {showPosterGrid && (
        <div className="poster-grid-overlay">
          <button className="close-button" onClick={onClosePosterGrid}>
            <CloseIcon />
          </button>
          <h2 className="poster-grid-title">Alternate Covers</h2>
          <div className="poster-grid">
            {alternatePosterUrls.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Alternate cover ${index + 1}`}
                className="alternate-poster"
                title={`Alternate Cover ${index + 1}`}
                onClick={() => {
                  logger.info(`POSTER: Selected alternate poster ${index + 1}`, {
                    context: 'Grid2x2.onSelectAlternatePoster',
                    action: 'poster_change',
                    posterIndex: index + 1,
                    posterPath: url,
                    timestamp: Date.now()
                  });
                  onSelectAlternatePoster(url);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Grid2x2;
