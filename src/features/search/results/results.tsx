import { MdClose } from 'react-icons/md';
import { isPlaceholderCover } from '../../../lib/coverdetect';
import type { MediaItem, MediaType } from '../../../media/types';
import { CandidateCard } from './card';
import { getExternalLinks } from './links';

type SearchResultsProps = {
  results: MediaItem[];
  availableCovers: MediaItem[];
  mediaType: MediaType;
  searchSummary: string;
  brokenResultIds: Record<string | number, true>;
  aspectRatios: Record<string | number, number>;
  onClose: () => void;
  onAdd: (media: MediaItem, availableCovers: MediaItem[]) => void;
  onPosterLoad: (
    resultId: string | number,
    event: React.SyntheticEvent<HTMLImageElement>,
  ) => void;
  onPosterError: (resultId: string | number) => void;
  showMoreCount: number;
  onShowMore: () => void;
};

export const SearchResults = ({
  results,
  availableCovers,
  mediaType,
  searchSummary,
  brokenResultIds,
  aspectRatios,
  onClose,
  onAdd,
  onPosterLoad,
  onPosterError,
  showMoreCount,
  onShowMore,
}: SearchResultsProps) => (
  <div className="search-results">
    <button
      type="button"
      className="search-close-button"
      onClick={onClose}
      aria-label="Close search results"
    >
      <MdClose aria-hidden="true" focusable="false" />
    </button>
    <div className="search-results-header">
      <span className="search-results-label">Results for</span>
      <h3 className="search-results-subtitle">
        {searchSummary.length > 40
          ? `${searchSummary.substring(0, 40)}...`
          : searchSummary}
      </h3>
    </div>
    <div className="search-results-grid">
      {results
        .filter((result) => !Object.hasOwn(brokenResultIds, result.id))
        .map((result) => {
          const imdbId =
            typeof result.metadata?.imdb_id === 'string'
              ? result.metadata.imdb_id
              : undefined;
          const externalLinks = getExternalLinks(result, mediaType, imdbId);

          const handlePosterLoad = (
            event: React.SyntheticEvent<HTMLImageElement>,
          ) => {
            if (
              mediaType === 'books' &&
              isPlaceholderCover(event.currentTarget)
            ) {
              onPosterError(result.id);
              return;
            }
            onPosterLoad(result.id, event);
          };

          return (
            <CandidateCard
              key={result.id}
              className="search-result-card"
              onClick={() => onAdd(result, availableCovers)}
              ariaLabel={`Add ${result.title}`}
              imageUrl={
                result.coverThumbnailUrl || result.coverUrl || undefined
              }
              imageAlt={`${result.title} cover`}
              imageClassName="search-result-poster-large"
              placeholderClassName="search-result-placeholder large"
              placeholderLabel="No cover"
              onImageLoad={handlePosterLoad}
              onImageError={() => onPosterError(result.id)}
              crossOrigin={mediaType === 'books' ? 'anonymous' : undefined}
              aspectRatio={aspectRatios[result.id]}
              dataMediaId={result.id}
              dataMediaTitle={result.title}
            >
              <div className="search-result-meta">
                <div className="search-result-title">
                  <span className="search-result-name">{result.title}</span>
                  {result.subtitle && (
                    <span className="search-result-subtitle">
                      {result.subtitle}
                    </span>
                  )}
                </div>
                {result.year && (
                  <span className="search-result-year">{result.year}</span>
                )}
              </div>
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
            </CandidateCard>
          );
        })}
    </div>
    {showMoreCount > 0 && (
      <div className="search-results-footer">
        <button
          type="button"
          className="search-results-more"
          onClick={onShowMore}
        >
          Show more
        </button>
      </div>
    )}
  </div>
);
