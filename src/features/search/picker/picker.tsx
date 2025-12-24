import { FaStar } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';
import { isPlaceholderCover } from '../../../lib/coverdetect';
import type { MediaItem, MediaType } from '../../../media/types';
import { CandidateCard } from '../results/card';
import { getExternalLinks } from '../results/links';
import Carousel from './carousel';

type PosterPickerProps = {
  coverViewMode: 'grid' | 'carousel';
  urls: string[];
  mediaTitle: string;
  mediaSubtitle?: string;
  mediaType: MediaType | string;
  selectedCoverUrl?: string | null;
  alternateItems?: MediaItem[];
  onCoverError: (url: string) => void;
  onClose: () => void;
  onSelectCarouselCover: (url: string) => void;
  onSelectGridCover: (url: string, index: number) => void;
};

export const PosterPicker = ({
  coverViewMode,
  urls,
  mediaTitle,
  mediaSubtitle,
  mediaType,
  selectedCoverUrl,
  alternateItems,
  onCoverError,
  onClose,
  onSelectCarouselCover,
  onSelectGridCover,
}: PosterPickerProps) => {
  const detectPlaceholder = mediaType === 'books';

  if (coverViewMode === 'carousel') {
    return (
      <Carousel
        urls={urls}
        mediaTitle={mediaTitle}
        mediaSubtitle={mediaSubtitle}
        onCoverError={onCoverError}
        onSelectCover={onSelectCarouselCover}
        onClose={onClose}
        detectPlaceholder={detectPlaceholder}
      />
    );
  }

  const headerLabel = mediaSubtitle
    ? `${mediaTitle} - ${mediaSubtitle}`
    : mediaTitle;
  const isTmdb = mediaType === 'movies' || mediaType === 'tv';

  return (
    <div className="search-results poster-picker">
      <button
        type="button"
        className="search-close-button"
        onClick={onClose}
        aria-label="Close alternate covers"
      >
        <MdClose aria-hidden="true" focusable="false" />
      </button>
      <div className="poster-picker-header">
        <span className="poster-picker-label">Alternates for</span>
        <h3 className="search-results-subtitle">{headerLabel}</h3>
      </div>
      <div className="poster-picker-grid">
        {urls.length === 0 ? (
          <div className="poster-picker-empty">No alternate covers</div>
        ) : (
          urls.map((url, index) => {
            const matchedItem = alternateItems?.find(
              (item) => item.coverUrl === url || item.coverThumbnailUrl === url,
            );
            const key =
              matchedItem?.id != null ? `${url}-${matchedItem.id}` : url;
            const isSelected = Boolean(
              selectedCoverUrl && url === selectedCoverUrl,
            );
            const linkTarget = matchedItem ?? null;
            const linkMediaType = (linkTarget?.type ?? mediaType) as MediaType;
            const imdbId =
              typeof linkTarget?.metadata?.imdb_id === 'string'
                ? linkTarget.metadata.imdb_id
                : undefined;
            const externalLinks = linkTarget
              ? getExternalLinks(linkTarget, linkMediaType, imdbId)
              : [];

            return (
              <CandidateCard
                key={key}
                className="poster-picker-card"
                onClick={() => onSelectGridCover(url, index)}
                ariaLabel={`Use alternate cover ${index + 1}`}
                imageUrl={url}
                imageAlt={`Alternate cover ${index + 1}`}
                imageClassName="poster-picker-image"
                onImageError={() => onCoverError(url)}
                onImageLoad={(event) => {
                  if (
                    detectPlaceholder &&
                    isPlaceholderCover(event.currentTarget)
                  ) {
                    onCoverError(url);
                  }
                }}
                crossOrigin={detectPlaceholder ? 'anonymous' : undefined}
              >
                {isSelected && (
                  <div className="poster-picker-badge" aria-hidden="true">
                    <FaStar />
                  </div>
                )}
                {!isTmdb && matchedItem && (
                  <div className="poster-picker-meta">
                    <div className="poster-picker-title">
                      {matchedItem.title}
                    </div>
                    {matchedItem.subtitle && (
                      <div className="poster-picker-subtitle">
                        {matchedItem.subtitle}
                      </div>
                    )}
                    {matchedItem.year && (
                      <div className="poster-picker-year">
                        {matchedItem.year}
                      </div>
                    )}
                    {externalLinks.length > 0 && (
                      <div className="search-result-badges">
                        {externalLinks.map((link) => (
                          <a
                            key={link.href}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="search-badge"
                            aria-label={link.label}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <img
                              src={`https://www.google.com/s2/favicons?sz=32&domain=${link.domain}`}
                              alt=""
                              aria-hidden="true"
                            />
                            <span>{link.label}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CandidateCard>
            );
          })
        )}
      </div>
    </div>
  );
};
