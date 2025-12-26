import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import type React from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import './grid.css';
import { isPlaceholderCover } from '../../lib/coverdetect';
import { useResizeObserver } from '../../lib/hooks';
import logger from '../../lib/logger';
import type { MediaItem } from '../../providers/types';
import { getAspectRatio } from './index';
import { GridRow, type RowLayout } from './row';

interface GridProps {
  items: MediaItem[];
  onRemoveMedia: (mediaId: string | number) => void;
  onPosterClick: (media: MediaItem) => void;
  onCaptionEdit: (media: MediaItem) => void;
  onReorderMedia: (
    sourceId: string | number,
    targetId: string | number,
  ) => void;
  columns: number;
  minRows: number;
  placeholderLabel?: string;
  onAspectRatioUpdate?: (mediaId: string | number, aspectRatio: number) => void;
  layoutDimension?: 'height' | 'chimney';
  captionMode?: 'hidden' | 'top' | 'bottom';
  captionEditsOnly?: boolean;
}

const MAXIMUM_GRID_WIDTH = 1600;

const calculateRowLayouts = (
  items: MediaItem[],
  columns: number,
  availableWidth: number,
  availableHeight: number,
  gap: number,
  minRowsVisible: number,
  layoutDimension: 'height' | 'chimney' = 'height',
): RowLayout[] => {
  const rows: RowLayout[] = [];
  const totalRows = Math.ceil(items.length / columns);

  if (layoutDimension === 'chimney') {
    const baseRows: RowLayout[] = [];
    for (let i = 0; i < items.length; i += columns) {
      const rowItems = items.slice(i, i + columns);
      const aspectRatios = rowItems.map(getAspectRatio);
      const sumAspectRatios = aspectRatios.reduce((sum, ar) => sum + ar, 0);
      const totalGaps = (rowItems.length - 1) * gap;
      const height = (availableWidth - totalGaps) / sumAspectRatios;

      baseRows.push({
        height,
        items: rowItems.map((media, index) => ({
          media,
          width: height * aspectRatios[index],
        })),
      });
    }

    const totalBaseHeight = baseRows.reduce((sum, row) => sum + row.height, 0);
    const totalGaps = Math.max(baseRows.length - 1, 0) * gap;
    const availableHeightForRows = Math.max(availableHeight - totalGaps, 0);
    const scale =
      totalBaseHeight > 0
        ? Math.min(1, availableHeightForRows / totalBaseHeight)
        : 1;

    baseRows.forEach((row) => {
      const scaledHeight = row.height * scale;
      rows.push({
        height: scaledHeight,
        items: row.items.map((entry) => ({
          media: entry.media,
          width: scaledHeight * getAspectRatio(entry.media),
        })),
      });
    });
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

const Grid: React.FC<GridProps> = ({
  items,
  onRemoveMedia,
  onPosterClick,
  onCaptionEdit,
  onReorderMedia,
  columns,
  minRows,
  placeholderLabel,
  onAspectRatioUpdate,
  layoutDimension = 'height',
  captionMode = 'hidden',
  captionEditsOnly = false,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [containerGap, setContainerGap] = useState(16);
  const [activeId, setActiveId] = useState<string | number | null>(null);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 6 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 150, tolerance: 6 },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  const updateContainerDimensions = useCallback(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const computedStyle = window.getComputedStyle(element);
    const paddingLeft = Number.parseFloat(computedStyle.paddingLeft);
    const paddingRight = Number.parseFloat(computedStyle.paddingRight);
    const paddingTop = Number.parseFloat(computedStyle.paddingTop);
    const paddingBottom = Number.parseFloat(computedStyle.paddingBottom);
    const gapValue = Number.parseFloat(
      computedStyle.getPropertyValue('--grid-gap'),
    );

    const availableWidth = element.clientWidth - paddingLeft - paddingRight;
    const availableHeight = element.clientHeight - paddingTop - paddingBottom;

    setContainerWidth(Math.min(availableWidth, MAXIMUM_GRID_WIDTH));
    setContainerHeight(availableHeight);
    setContainerGap(Number.isNaN(gapValue) ? 0 : gapValue);
  }, []);

  useResizeObserver(wrapperRef, updateContainerDimensions);

  const rowLayouts = useMemo(() => {
    if (containerWidth === 0 || containerHeight === 0) return [];
    return calculateRowLayouts(
      items,
      columns,
      containerWidth,
      containerHeight,
      containerGap,
      minRows,
      layoutDimension,
    );
  }, [
    items,
    columns,
    containerWidth,
    containerHeight,
    containerGap,
    minRows,
    layoutDimension,
  ]);

  const handleImageLoad = (
    media: MediaItem,
    event: React.SyntheticEvent<HTMLImageElement>,
  ) => {
    const img = event.target as HTMLImageElement;
    if (media.type === 'books' && isPlaceholderCover(img)) {
      logger.info(
        {
          context: 'Grid.posterLoad',
          action: 'poster_placeholder',
          media: { id: media.id, title: media.title },
          timestamp: Date.now(),
        },
        `GRID: Removed placeholder cover for "${media.title}"`,
      );
      onRemoveMedia(media.id);
      return;
    }
    const naturalAspectRatio = img.naturalWidth / img.naturalHeight;

    if (!media.aspectRatio && onAspectRatioUpdate) {
      onAspectRatioUpdate(media.id, naturalAspectRatio);
    }

    logger.info(
      {
        context: 'Grid.posterLoad',
        action: 'poster_dimensions',
        media: { id: media.id, title: media.title },
        naturalAspectRatio,
        timestamp: Date.now(),
      },
      `GRID: Poster loaded - ${img.naturalWidth}x${img.naturalHeight} (${naturalAspectRatio.toFixed(2)})`,
    );
  };

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (over && active.id !== over.id) {
        onReorderMedia(active.id, over.id);
      }
    },
    [onReorderMedia],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const activeItem = activeId
    ? items.find((item) => item.id === activeId)
    : null;

  const renderGrid = () => {
    if (placeholderLabel && items.length === 0) {
      return (
        <div className="grid-container grid-container-empty">
          <div className="empty-state-hint">{placeholderLabel}</div>
        </div>
      );
    }

    const itemIds = items.map((item) => item.id);

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={itemIds} strategy={rectSortingStrategy}>
          <div className="grid-container">
            {rowLayouts.map((row) => (
              <GridRow
                key={
                  row.items.map(({ media }) => media.id).join('-') || row.height
                }
                row={row}
                layoutDimension={layoutDimension}
                containerGap={containerGap}
                captionMode={captionMode}
                captionEditsOnly={captionEditsOnly}
                activeId={activeId}
                onRemoveMedia={onRemoveMedia}
                onPosterClick={onPosterClick}
                onCaptionEdit={onCaptionEdit}
                onImageLoad={handleImageLoad}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeItem && (
            <div className="grid-item-overlay">
              <img
                src={activeItem.coverUrl || activeItem.coverThumbnailUrl || ''}
                alt={activeItem.title}
                className="grid-poster"
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    );
  };

  return (
    <div
      ref={wrapperRef}
      className="grid"
      data-layout-dimension={layoutDimension}
    >
      {renderGrid()}
    </div>
  );
};

export default Grid;
