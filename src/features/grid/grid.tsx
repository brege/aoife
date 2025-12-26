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
  layoutDimension?: 'width' | 'height';
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
  const [draggingId, setDraggingId] = useState<string | number | null>(null);
  const [dragOverId, setDragOverId] = useState<string | number | null>(null);
  const dragStateRef = useRef<{
    pointerId: number | null;
    sourceId: string | number | null;
    startX: number;
    startY: number;
    isDragging: boolean;
  }>({
    pointerId: null,
    sourceId: null,
    startX: 0,
    startY: 0,
    isDragging: false,
  });

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

  const handlePointerDown = useCallback(
    (mediaId: string | number, event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          '.grid-close-button, .media-type-badge, .grid-source-link',
        )
      ) {
        return;
      }
      if (
        event.pointerType !== 'touch' &&
        !target?.closest('.grid-drag-handle')
      ) {
        return;
      }
      dragStateRef.current = {
        pointerId: event.pointerId,
        sourceId: mediaId,
        startX: event.clientX,
        startY: event.clientY,
        isDragging: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;
      if (
        dragState.pointerId !== event.pointerId ||
        dragState.sourceId == null
      ) {
        return;
      }
      const distance = Math.hypot(
        event.clientX - dragState.startX,
        event.clientY - dragState.startY,
      );
      if (!dragState.isDragging) {
        if (distance < 6) {
          return;
        }
        dragState.isDragging = true;
        setDraggingId(dragState.sourceId);
      }

      event.preventDefault();

      const target = document.elementFromPoint(event.clientX, event.clientY);
      const itemElement = target?.closest('.grid-item[data-media-id]');
      if (!itemElement) {
        if (dragOverId !== null) {
          setDragOverId(null);
        }
        return;
      }
      const dataId = itemElement.getAttribute('data-media-id');
      if (!dataId) {
        return;
      }
      const targetItem = items.find((item) => String(item.id) === dataId);
      if (!targetItem) {
        return;
      }
      if (targetItem.id === dragState.sourceId) {
        if (dragOverId !== null) {
          setDragOverId(null);
        }
        return;
      }
      if (dragOverId !== targetItem.id) {
        setDragOverId(targetItem.id);
      }
    },
    [dragOverId, items],
  );

  const handlePointerUp = useCallback(() => {
    const dragState = dragStateRef.current;
    if (
      dragState.isDragging &&
      dragState.sourceId != null &&
      dragOverId != null
    ) {
      onReorderMedia(dragState.sourceId, dragOverId);
    }
    dragStateRef.current = {
      pointerId: null,
      sourceId: null,
      startX: 0,
      startY: 0,
      isDragging: false,
    };
    setDraggingId(null);
    setDragOverId(null);
  }, [dragOverId, onReorderMedia]);

  const handlePointerCancel = useCallback(() => {
    dragStateRef.current = {
      pointerId: null,
      sourceId: null,
      startX: 0,
      startY: 0,
      isDragging: false,
    };
    setDraggingId(null);
    setDragOverId(null);
  }, []);

  const renderGrid = () => {
    if (placeholderLabel && items.length === 0) {
      return (
        <div className="grid-container grid-container-empty">
          <div className="empty-state-hint">{placeholderLabel}</div>
        </div>
      );
    }

    return (
      <div className="grid-container">
        {rowLayouts.map((row) => (
          <GridRow
            key={row.items.map(({ media }) => media.id).join('-') || row.height}
            row={row}
            layoutDimension={layoutDimension}
            containerGap={containerGap}
            captionMode={captionMode}
            captionEditsOnly={captionEditsOnly}
            draggingId={draggingId}
            dragOverId={dragOverId}
            onRemoveMedia={onRemoveMedia}
            onPosterClick={onPosterClick}
            onCaptionEdit={onCaptionEdit}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onImageLoad={handleImageLoad}
          />
        ))}
      </div>
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
