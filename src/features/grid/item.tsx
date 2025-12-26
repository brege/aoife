import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type React from 'react';
import { MdClose } from 'react-icons/md';
import type { MediaItem, MediaType } from '../../providers/types';
import { CustomImage } from '../../ui/customimage';
import { getExternalLinks } from '../search/results/links';
import { MEDIA_TYPE_ICONS } from '../search/suggestion/list';
import { getCaptionSubtitle, getCaptionTitle, getCoverSource } from './index';

type GridItemProps = {
  media: MediaItem;
  width: number;
  rowHeight: number;
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

const GridItem = ({
  media,
  width,
  rowHeight,
  captionMode,
  captionEditsOnly,
  activeId,
  onRemoveMedia,
  onPosterClick,
  onCaptionEdit,
  onImageLoad,
}: GridItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: media.id });

  const style = {
    width,
    height: rowHeight,
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const coverSource = getCoverSource(media);
  const captionTitle = getCaptionTitle(media);
  const captionSubtitle = getCaptionSubtitle(media);
  const imdbId =
    typeof media.metadata?.imdb_id === 'string'
      ? media.metadata.imdb_id
      : undefined;
  const externalLinks = getExternalLinks(
    media,
    media.type as MediaType,
    imdbId,
  );
  const hasEditedCaption =
    typeof media.caption === 'string' && media.caption.trim() !== '';
  const showCaption =
    captionMode !== 'hidden' &&
    (!captionEditsOnly || hasEditedCaption) &&
    (captionTitle.trim() !== '' || captionSubtitle !== '');
  const captionClassName = `grid-caption grid-caption-${captionMode}`;
  const isBeingDragged = isDragging || activeId === media.id;

  return (
    <div
      ref={setNodeRef}
      className={`grid-item filled${isBeingDragged ? ' is-dragging' : ''}`}
      data-type={media.type}
      data-media-id={String(media.id)}
      style={style}
      {...attributes}
      {...listeners}
    >
      <div className="poster-wrapper">
        <button
          type="button"
          className="poster-button"
          onClick={() => {
            if (isBeingDragged) {
              return;
            }
            onPosterClick(media);
          }}
          aria-label={`View poster for ${media.title}`}
        >
          <CustomImage
            src={coverSource}
            alt={`${media.title} cover`}
            className="grid-poster"
            onLoad={(event) => onImageLoad(media, event)}
            crossOrigin={media.type === 'books' ? 'anonymous' : undefined}
          />
        </button>
        {showCaption && (
          <div className={captionClassName}>
            <div className="grid-caption-title">{captionTitle}</div>
            {captionSubtitle && (
              <div className="grid-caption-subtitle">{captionSubtitle}</div>
            )}
          </div>
        )}
        <button
          type="button"
          className="grid-close-button"
          onClick={() => onRemoveMedia(media.id)}
          aria-label={`Remove ${media.title}`}
        >
          <MdClose aria-hidden="true" focusable="false" />
        </button>
        <button
          type="button"
          className="media-type-badge"
          aria-label={`edit caption for ${media.title}`}
          title={`edit caption - ${media.type}`}
          onClick={() => onCaptionEdit(media)}
        >
          {MEDIA_TYPE_ICONS[media.type as MediaType]}
        </button>
        {externalLinks.length > 0 && (
          <div className="grid-source-badges">
            {externalLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="grid-source-link"
                aria-label={link.label}
                title={link.label}
                onClick={(event) => event.stopPropagation()}
              >
                <img
                  src={`https://www.google.com/s2/favicons?sz=32&domain=${link.domain}`}
                  alt=""
                  aria-hidden="true"
                />
                <span className="sr-only">{link.label}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export { GridItem };
