import type React from 'react';
import type { MediaItem } from '../../providers/types';
import { GridItem } from './item';

export type RowLayout = {
  height: number;
  items: { media: MediaItem; width: number }[];
};

type GridRowProps = {
  row: RowLayout;
  layoutDimension: 'width' | 'height';
  containerGap: number;
  captionMode: 'hidden' | 'top' | 'bottom';
  captionEditsOnly: boolean;
  draggingId: string | number | null;
  dragOverId: string | number | null;
  onRemoveMedia: (mediaId: string | number) => void;
  onPosterClick: (media: MediaItem) => void;
  onCaptionEdit: (media: MediaItem) => void;
  onPointerDown: (
    mediaId: string | number,
    event: React.PointerEvent<HTMLDivElement>,
  ) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onImageLoad: (
    media: MediaItem,
    event: React.SyntheticEvent<HTMLImageElement>,
  ) => void;
};

const GridRow = ({
  row,
  layoutDimension,
  containerGap,
  captionMode,
  captionEditsOnly,
  draggingId,
  dragOverId,
  onRemoveMedia,
  onPosterClick,
  onCaptionEdit,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onImageLoad,
}: GridRowProps) => {
  return (
    <div
      className="grid-row"
      style={{
        height: layoutDimension === 'width' ? 'auto' : row.height,
        gap: containerGap,
      }}
    >
      {row.items.map(({ media, width }) => (
        <GridItem
          key={media.id}
          media={media}
          width={width}
          rowHeight={row.height}
          layoutDimension={layoutDimension}
          captionMode={captionMode}
          captionEditsOnly={captionEditsOnly}
          draggingId={draggingId}
          dragOverId={dragOverId}
          onRemoveMedia={onRemoveMedia}
          onPosterClick={onPosterClick}
          onCaptionEdit={onCaptionEdit}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onImageLoad={onImageLoad}
        />
      ))}
    </div>
  );
};

export { GridRow };
