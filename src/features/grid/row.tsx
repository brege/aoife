import type React from 'react';
import type { MediaItem } from '../../providers/types';
import { GridItem } from './item';

export type RowLayout = {
  height: number;
  items: { media: MediaItem; width: number }[];
};

type GridRowProps = {
  row: RowLayout;
  layoutDimension: 'height' | 'chimney';
  containerGap: number;
  captionMode: 'hidden' | 'top' | 'bottom';
  captionEditsOnly: boolean;
  activeId: string | number | null;
  onRemoveMedia: (mediaId: string | number) => void;
  onPosterClick: (media: MediaItem) => void;
  onCaptionEdit: (media: MediaItem) => void;
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
  activeId,
  onRemoveMedia,
  onPosterClick,
  onCaptionEdit,
  onImageLoad,
}: GridRowProps) => {
  return (
    <div
      className="grid-row"
      style={{
        height: row.height,
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
          activeId={activeId}
          onRemoveMedia={onRemoveMedia}
          onPosterClick={onPosterClick}
          onCaptionEdit={onCaptionEdit}
          onImageLoad={onImageLoad}
        />
      ))}
    </div>
  );
};

export { GridRow };
