import React, { useEffect, useRef, useState } from 'react';
import './grid.css';
import logger from '../../lib/logger';
import type { MediaType } from '../../media/types';
import { type MediaItem, TMDB_IMAGE_BASE } from '../../media/types';
import { MEDIA_TYPE_ICONS } from '../search/dropdown';
import CloseIcon from '../ui/close';
import { CustomImage } from '../ui/customimage';
import { useModalManager } from '../../lib/modalmanager';

interface Grid2x2Props {
  items: MediaItem[];
  onRemoveMedia: (mediaId: string | number) => void;
  onPosterClick: (media: MediaItem) => void;
  showPosterGrid: boolean;
  alternatePosterUrls: string[];
  onSelectAlternatePoster: (url: string) => void;
  onClosePosterGrid: () => void;
  onPlaceholderClick: () => void;
  columns: number;
  minRows: number;
  placeholderLabel: string;
  isBuilderMode?: boolean;
  onAspectRatioUpdate?: (mediaId: string | number, aspectRatio: number) => void;
}

const DEFAULT_ASPECT_RATIOS: Record<string, number> = {
  movies: 2 / 3,
  books: 2 / 3,
  music: 1,
};

const getCoverSrc = (media: MediaItem) => {
  if (media.coverUrl) return media.coverUrl;
  if (media.coverThumbnailUrl) return media.coverThumbnailUrl;
  const posterPath =
    typeof media.metadata?.poster_path === 'string'
      ? media.metadata?.poster_path
      : undefined;
  return posterPath ? `${TMDB_IMAGE_BASE}/w300${posterPath}` : '';
};

const getAspectRatio = (media: MediaItem): number => {
  if (media.aspectRatio) return media.aspectRatio;
  return DEFAULT_ASPECT_RATIOS[media.type] ?? 2 / 3;
};

interface RowLayout {
  height: number;
  items: { media: MediaItem; width: number }[];
}

const calculateRowLayouts = (
  items: MediaItem[],
  columns: number,
  availableWidth: number,
  availableHeight: number,
  gap: number,
  minRowsVisible: number,
): RowLayout[] => {
  const rows: RowLayout[] = [];
  const totalRows = Math.ceil(items.length / columns);
  const effectiveMinRows = Math.max(totalRows, minRowsVisible);
  const maxRowHeight =
    (availableHeight - (effectiveMinRows - 1) * gap) / effectiveMinRows;

  for (let i = 0; i < items.length; i += columns) {
    const rowItems = items.slice(i, i + columns);
    const aspectRatios = rowItems.map(getAspectRatio);
    const sumAspectRatios = aspectRatios.reduce((sum, ar) => sum + ar, 0);
    const totalGaps = (rowItems.length - 1) * gap;
    const naturalHeight = (availableWidth - totalGaps) / sumAspectRatios;
    const height = Math.min(naturalHeight, maxRowHeight);

    rows.push({
      height,
      items: rowItems.map((media, index) => ({
        media,
        width: height * aspectRatios[index],
      })),
    });
  }

  return rows;
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
  columns,
  minRows,
  placeholderLabel,
  isBuilderMode = true,
  onAspectRatioUpdate,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const updateDimensions = () => {
      if (!isBuilderMode) {
        const horizontalPadding = 80;
        const headerHeight = 80;
        const verticalPadding = 80;
        const availableWidth = window.innerWidth - horizontalPadding;
        const availableHeight =
          window.innerHeight - headerHeight - verticalPadding;
        setContainerWidth(Math.min(availableWidth, 1600));
        setContainerHeight(availableHeight);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isBuilderMode]);

  const { openModal, closeModal } = useModalManager();

  useEffect(() => {
    if (showPosterGrid) {
      openModal('posterGrid');
    } else {
      closeModal('posterGrid');
    }
  }, [showPosterGrid, openModal, closeModal]);

  useEffect(() => {
    const handleModalClosed = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.modal === 'posterGrid') {
        onClosePosterGrid();
      }
    };

    window.addEventListener('modalClosed', handleModalClosed);
    return () => window.removeEventListener('modalClosed', handleModalClosed);
  }, [onClosePosterGrid]);

  const gap = 16;
  const rowLayouts = React.useMemo(() => {
    if (isBuilderMode || containerWidth === 0 || containerHeight === 0)
      return [];
    return calculateRowLayouts(
      items,
      columns,
      containerWidth,
      containerHeight,
      gap,
      minRows,
    );
  }, [items, columns, containerWidth, containerHeight, isBuilderMode, minRows]);

  const handleImageLoad = (
    media: MediaItem,
    event: React.SyntheticEvent<HTMLImageElement>,
  ) => {
    const img = event.target as HTMLImageElement;
    const naturalAspectRatio = img.naturalWidth / img.naturalHeight;

    if (!media.aspectRatio && onAspectRatioUpdate) {
      onAspectRatioUpdate(media.id, naturalAspectRatio);
    }

    logger.info(
      `GRID: Poster loaded - ${img.naturalWidth}x${img.naturalHeight} (${naturalAspectRatio.toFixed(2)})`,
      {
        context: 'Grid2x2.posterLoad',
        action: 'poster_dimensions',
        media: { id: media.id, title: media.title },
        naturalAspectRatio,
        timestamp: Date.now(),
      },
    );
  };

  const renderBuilderMode = () => {
    const positionsToRender = Math.max(items.length + 1, 1);

    return (
      <div ref={gridContainerRef} className="grid-container">
        {Array.from({ length: positionsToRender }, (_, position) => {
          const item = items[position];

          if (item) {
            return (
              <div
                key={item.id}
                className="grid-item filled"
                data-type={item.type}
              >
                <div className="poster-wrapper">
                  <button
                    type="button"
                    className="poster-button"
                    onClick={() => onPosterClick(item)}
                    aria-label={`View poster for ${item.title}`}
                  >
                    <CustomImage
                      src={getCoverSrc(item) || ''}
                      alt={`${item.title} cover`}
                      className="grid-poster"
                      onLoad={(e) => handleImageLoad(item, e)}
                    />
                  </button>
                  <button
                    type="button"
                    className="close-button grid-close-button"
                    onClick={() => onRemoveMedia(item.id)}
                    aria-label={`Remove ${item.title}`}
                  >
                    <CloseIcon />
                  </button>
                  <div className="media-type-badge">
                    {MEDIA_TYPE_ICONS[item.type as MediaType]}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <button
              key="builder-placeholder"
              type="button"
              className="grid-item empty"
              onClick={onPlaceholderClick}
              title={`Add a ${placeholderLabel}`}
            >
              <div className="placeholder-content">
                <span>+</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderPresentationMode = () => {
    return (
      <div ref={gridContainerRef} className="grid-container">
        {rowLayouts.map((row) => {
          const rowKey =
            row.items.map(({ media }) => media.id).join('-') ||
            `row-${row.height}`;
          return (
            <div
              key={rowKey}
              className="grid-row"
              style={{ height: row.height, gap }}
            >
              {row.items.map(({ media, width }) => (
                <div
                  key={media.id}
                  className="grid-item filled"
                  data-type={media.type}
                  style={{ width, height: row.height }}
                >
                  <div className="poster-wrapper">
                    <button
                      type="button"
                      className="poster-button"
                      onClick={() => onPosterClick(media)}
                      aria-label={`View poster for ${media.title}`}
                    >
                      <CustomImage
                        src={getCoverSrc(media) || ''}
                        alt={`${media.title} cover`}
                        className="grid-poster"
                        onLoad={(e) => handleImageLoad(media, e)}
                      />
                    </button>
                    <button
                      type="button"
                      className="close-button grid-close-button"
                      onClick={() => onRemoveMedia(media.id)}
                      aria-label={`Remove ${media.title}`}
                    >
                      <CloseIcon />
                    </button>
                    <div className="media-type-badge">
                      {MEDIA_TYPE_ICONS[media.type as MediaType]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      ref={wrapperRef}
      className={`grid-2x2 ${isBuilderMode ? 'grid-builder' : 'grid-presentation'}`}
    >
      {isBuilderMode ? renderBuilderMode() : renderPresentationMode()}

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
