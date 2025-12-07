import React, { useRef } from 'react';
import './grid.css';
import logger from '../logger';
import {
  type AspectRatio,
  type MediaItem,
  TMDB_IMAGE_BASE,
} from '../media/types';
import CloseIcon from './close';

export type GridLayoutMode =
  | 'auto'
  | 'force-2x2'
  | 'prefer-horizontal'
  | 'vertical-stack';

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
  aspectRatio?: AspectRatio;
}

const getCoverSrc = (media: MediaItem) => {
  if (media.coverUrl) return media.coverUrl;
  if (media.coverThumbnailUrl) return media.coverThumbnailUrl;
  const posterPath =
    typeof media.metadata?.poster_path === 'string'
      ? media.metadata?.poster_path
      : undefined;
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
  aspectRatio = '2:3',
}) => {
  const itemCount = items.length;
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const getLayoutValue = (): string => {
    switch (layoutMode) {
      case 'force-2x2':
      case 'prefer-horizontal':
      case 'vertical-stack':
        return layoutMode;
      default:
        return String(Math.min(itemCount, 4));
    }
  };

  const layoutValue = getLayoutValue();

  const positionsToRender = React.useMemo(() => {
    if (itemCount === 0) return [0];
    if (itemCount === 1) return [0, 1];
    if (itemCount === 2) return [0, 1, 2];
    if (itemCount === 3) return [0, 1, 2, 3];
    return [0, 1, 2, 3];
  }, [itemCount]);

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
        userAgent: navigator.userAgent.includes('Mobile')
          ? 'mobile'
          : 'desktop',
      },
      container: {
        dimensions: {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          left: Math.round(rect.left),
          top: Math.round(rect.top),
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
          margin: styles.margin,
        },
        dataLayout: layoutValue,
        dataFit: fitToScreen,
      },
      layout: {
        mode: layoutMode,
        layoutValue: layoutValue,
        fitToScreen: fitToScreen,
        movieCount: itemCount,
        positions: positionsToRender,
      },
      matrix: {
        rendered: positionsToRender.map((pos) => ({
          position: pos,
          row: Math.floor(pos / 2),
          col: pos % 2,
          hasMedia: !!items[pos],
          mediaTitle: items[pos]?.title || 'placeholder',
        })),
      },
    };

    logger.info(`GRID-DEBUG: Layout state captured`, {
      context: 'Grid2x2.layoutDebug',
      action: 'layout_state_capture',
      debugInfo,
      timestamp: Date.now(),
    });

    window.gridDebugInfo = debugInfo;
  }, [
    layoutMode,
    layoutValue,
    fitToScreen,
    itemCount,
    items,
    positionsToRender,
  ]);

  const renderGridItem = (position: number) => {
    const item = items[position];

    if (item) {
      return (
        <div key={item.id} className="grid-item filled" data-type={item.type}>
          <div className="poster-wrapper">
            <button
              type="button"
              className="poster-button"
              onClick={() => onPosterClick(item)}
              aria-label={`View poster for ${item.title}`}
            >
              <img
                src={getCoverSrc(item) || ''}
                alt={`${item.title} cover`}
                className="grid-poster"
                title={`${item.title}${item.year ? ` (${item.year})` : ''}`}
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement;
                  setTimeout(() => {
                    const itemElement = img.closest(
                      '.grid-item',
                    ) as HTMLElement;

                    // For books, apply actual image aspect ratio
                    if (item.type === 'books' && itemElement) {
                      const actualRatio = img.naturalWidth / img.naturalHeight;
                      itemElement.style.setProperty(
                        '--item-aspect-ratio',
                        String(actualRatio),
                      );
                    }

                    const rect = img.getBoundingClientRect();
                    const itemRect = itemElement?.getBoundingClientRect();
                    const itemStyles = itemElement
                      ? getComputedStyle(itemElement)
                      : null;

                    const dimensions = {
                      displayWidth: Math.round(rect.width),
                      displayHeight: Math.round(rect.height),
                      naturalWidth: img.naturalWidth,
                      naturalHeight: img.naturalHeight,
                      aspectRatio: (rect.width / rect.height).toFixed(2),
                    };

                    const itemInfo =
                      itemRect && itemStyles
                        ? {
                            itemWidth: Math.round(itemRect.width),
                            itemHeight: Math.round(itemRect.height),
                            itemComputedWidth: itemStyles.width,
                            itemMinWidth: itemStyles.minWidth,
                            itemMaxWidth: itemStyles.maxWidth,
                          }
                        : {};

                    const viewportWidth = window.innerWidth;
                    const availableWidth = viewportWidth - 32;
                    const optimalSingleWidth = Math.min(
                      200,
                      availableWidth * 0.8,
                    );
                    const optimalTwoColumnWidth = Math.min(
                      164,
                      (availableWidth - 16) / 2,
                    );

                    const analysis = {
                      viewport: viewportWidth,
                      available: availableWidth,
                      optimalSingle: optimalSingleWidth,
                      optimalTwoColumn: optimalTwoColumnWidth,
                      actualPoster: dimensions.displayWidth,
                      actualItem: itemInfo.itemWidth,
                      efficiency: itemInfo.itemWidth
                        ? `${(
                            (dimensions.displayWidth / itemInfo.itemWidth) * 100
                          ).toFixed(1)}%`
                        : 'N/A',
                    };

                    logger.info(
                      `GRID: Poster loaded at position ${position} - ${dimensions.displayWidth}x${dimensions.displayHeight}`,
                      {
                        context: 'Grid2x2.posterLoad',
                        action: 'poster_dimensions',
                        media: { id: item.id, title: item.title },
                        position,
                        dimensions,
                        itemInfo,
                        analysis,
                        gridPosition: `(${Math.floor(position / 2)}, ${position % 2})`,
                        timestamp: Date.now(),
                      },
                    );
                  }, 50);
                }}
              />
            </button>
            <button
              type="button"
              className="close-button"
              onClick={() => {
                logger.info(
                  `GRID: Removed "${item.title}" from position ${position}`,
                  {
                    context: 'Grid2x2.onRemoveMedia',
                    action: 'grid_remove_media',
                    mediaId: item.id,
                    position,
                    timestamp: Date.now(),
                  },
                );
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
      <button
        key={`placeholder-${position}`}
        type="button"
        className="grid-item empty"
        data-aspect={aspectRatio}
        onClick={onPlaceholderClick}
        title={`Add a ${placeholderLabel}`}
      >
        <div className="placeholder-content">
          <span>+</span>
        </div>
      </button>
    );
  };

  return (
    <div className="grid-2x2">
      <div
        ref={gridContainerRef}
        className="grid-container"
        data-layout={layoutValue}
        data-fit={fitToScreen}
      >
        {positionsToRender.map((position) => renderGridItem(position))}
      </div>

      {showPosterGrid && (
        <div className="poster-grid-overlay">
          <button
            type="button"
            className="close-button"
            onClick={onClosePosterGrid}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClosePosterGrid();
              }
            }}
          >
            <CloseIcon />
          </button>
          <h2 className="poster-grid-title">Alternate Covers</h2>
          <div className="poster-grid">
            {alternatePosterUrls.map((url, index) => (
              <button
                key={url}
                type="button"
                className="alternate-poster-button"
                onClick={() => {
                  logger.info(
                    `POSTER: Selected alternate poster ${index + 1}`,
                    {
                      context: 'Grid2x2.onSelectAlternatePoster',
                      action: 'poster_change',
                      posterIndex: index + 1,
                      posterPath: url,
                      timestamp: Date.now(),
                    },
                  );
                  onSelectAlternatePoster(url);
                }}
                aria-label={`Select alternate cover ${index + 1}`}
              >
                <img
                  src={url}
                  alt={`Alternate cover ${index + 1}`}
                  className="alternate-poster"
                  title={`Alternate Cover ${index + 1}`}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Grid2x2;
