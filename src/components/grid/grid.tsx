import React, { useCallback, useEffect, useRef, useState } from 'react';
import './grid.css';
import { MdClose } from 'react-icons/md';
import logger from '../../lib/logger';
import type { MediaType } from '../../media/types';
import { type MediaItem, TMDB_IMAGE_BASE } from '../../media/types';
import { MEDIA_TYPE_ICONS } from '../search/dropdown';
import { CustomImage } from '../ui/customimage';

interface Grid2x2Props {
  items: MediaItem[];
  onRemoveMedia: (mediaId: string | number) => void;
  onPosterClick: (media: MediaItem) => void;
  columns: number;
  minRows: number;
  placeholderLabel?: string;
  isBuilderMode?: boolean;
  onAspectRatioUpdate?: (mediaId: string | number, aspectRatio: number) => void;
  layoutDimension?: 'width' | 'height';
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

const MAXIMUM_GRID_WIDTH = 1600;

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
  layoutDimension: 'width' | 'height' = 'height',
): RowLayout[] => {
  const rows: RowLayout[] = [];
  const totalRows = Math.ceil(items.length / columns);

  if (layoutDimension === 'width') {
    const totalGaps = (columns - 1) * gap;
    const fixedWidth = (availableWidth - totalGaps) / columns;

    for (let i = 0; i < items.length; i += columns) {
      const rowItems = items.slice(i, i + columns);
      const heights = rowItems.map(
        (media) => fixedWidth / getAspectRatio(media),
      );
      const height = Math.max(...heights);

      rows.push({
        height,
        items: rowItems.map((media) => ({
          media,
          width: fixedWidth,
        })),
      });
    }
  } else {
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
  }

  return rows;
};

const Grid2x2: React.FC<Grid2x2Props> = ({
  items,
  onRemoveMedia,
  onPosterClick,
  columns,
  minRows,
  placeholderLabel,
  isBuilderMode = true,
  onAspectRatioUpdate,
  layoutDimension = 'height',
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const updateContainerDimensions = useCallback(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const computedStyle = window.getComputedStyle(element);
    const paddingLeft = Number.parseFloat(computedStyle.paddingLeft);
    const paddingRight = Number.parseFloat(computedStyle.paddingRight);
    const paddingTop = Number.parseFloat(computedStyle.paddingTop);
    const paddingBottom = Number.parseFloat(computedStyle.paddingBottom);

    const availableWidth = element.clientWidth - paddingLeft - paddingRight;
    const availableHeight = element.clientHeight - paddingTop - paddingBottom;

    setContainerWidth(Math.min(availableWidth, MAXIMUM_GRID_WIDTH));
    setContainerHeight(availableHeight);
  }, []);

  useEffect(() => {
    updateContainerDimensions();
    const observer = new ResizeObserver(updateContainerDimensions);
    const element = wrapperRef.current;
    if (element) {
      observer.observe(element);
    }
    return () => observer.disconnect();
  }, [updateContainerDimensions]);

  const gap = 16;
  const rowLayouts = React.useMemo(() => {
    if (containerWidth === 0 || containerHeight === 0) return [];
    return calculateRowLayouts(
      items,
      columns,
      containerWidth,
      containerHeight,
      gap,
      minRows,
      layoutDimension,
    );
  }, [
    items,
    columns,
    containerWidth,
    containerHeight,
    minRows,
    layoutDimension,
  ]);

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

  const renderPresentationMode = () => {
    if (isBuilderMode && placeholderLabel && items.length === 0) {
      return (
        <div className="grid-container grid-container-empty">
          <div className="empty-state-hint">
            Add a {placeholderLabel}
          </div>
        </div>
      );
    }

    return (
      <div className="grid-container">
        {rowLayouts.map((row) => {
          const rowKey =
            row.items.map(({ media }) => media.id).join('-') ||
            `row-${row.height}`;
          return (
            <div
              key={rowKey}
              className="grid-row"
              style={{
                height: layoutDimension === 'width' ? 'auto' : row.height,
                gap,
              }}
            >
              {row.items.map(({ media, width }) => (
                <div
                  key={media.id}
                  className="grid-item filled"
                  data-type={media.type}
                  style={{
                    width,
                    height: layoutDimension === 'width' ? 'auto' : row.height,
                  }}
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
                      className="grid-close-button"
                      onClick={() => onRemoveMedia(media.id)}
                      aria-label={`Remove ${media.title}`}
                    >
                      <MdClose aria-hidden="true" focusable="false" />
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

  const gridClassName = 'grid-presentation';

  return (
    <div
      ref={wrapperRef}
      className={`grid-2x2 ${gridClassName}`}
      data-layout-dimension={layoutDimension}
    >
      {renderPresentationMode()}
    </div>
  );
};

export default Grid2x2;
