import { MdClose } from 'react-icons/md';
import type { MediaItem, MediaType } from '../../../media/types';
import { isPlaceholderCover } from '../../../lib/coverdetect';
import { CandidateCard } from './card';

type ExternalLink = {
  href: string;
  label: string;
  domain: string;
};

const pickInternationalStandardBookNumber = (
  identifiers: unknown,
): string | null => {
  if (!Array.isArray(identifiers)) {
    return null;
  }
  const normalized = identifiers
    .filter((identifier) => typeof identifier === 'string')
    .map((identifier) => identifier.replace(/[^0-9Xx]/g, '').toUpperCase())
    .filter((identifier) => identifier.length > 0);
  const preferred = normalized.find((identifier) => identifier.length === 13);
  if (preferred) {
    return preferred;
  }
  const fallback = normalized.find((identifier) => identifier.length === 10);
  return fallback || null;
};

const getExternalLinks = (
  result: MediaItem,
  mediaType: MediaType,
  imdbId?: string,
): ExternalLink[] => {
  const links: ExternalLink[] = [];

  if (mediaType === 'movies' || mediaType === 'tv') {
    links.push({
      href: `https://www.themoviedb.org/${mediaType === 'tv' ? 'tv' : 'movie'}/${result.id}`,
      label: 'TMDB',
      domain: 'www.themoviedb.org',
    });

    if (mediaType === 'movies') {
      links.push({
        href: `https://letterboxd.com/tmdb/${result.id}`,
        label: 'Letterboxd',
        domain: 'letterboxd.com',
      });
    }

    if (imdbId) {
      links.push({
        href: `https://www.imdb.com/title/${imdbId}/`,
        label: 'IMDb',
        domain: 'www.imdb.com',
      });
    }
  }

  if (mediaType === 'books') {
    if (
      result.source === 'OpenLibrary' &&
      typeof result.metadata?.openLibraryKey === 'string'
    ) {
      links.push({
        href: `https://openlibrary.org${result.metadata.openLibraryKey}`,
        label: 'Open Library',
        domain: 'openlibrary.org',
      });
    } else if (
      result.source === 'GoogleBooks' &&
      typeof result.metadata?.volumeId === 'string'
    ) {
      links.push({
        href: `https://books.google.com/books?id=${result.metadata.volumeId}`,
        label: 'Google Books',
        domain: 'books.google.com',
      });
      const isbn = pickInternationalStandardBookNumber(
        result.metadata?.internationalStandardBookNumbers,
      );
      if (isbn) {
        links.push({
          href: `https://openlibrary.org/isbn/${isbn}`,
          label: 'Open Library',
          domain: 'openlibrary.org',
        });
      }
    }
  }

  if (mediaType === 'music' && typeof result.metadata?.mbid === 'string') {
    if (
      result.metadata?.coverSource === 'CoverArtArchiveReleaseGroup' &&
      typeof result.metadata?.releaseGroup === 'string'
    ) {
      links.push({
        href: `https://musicbrainz.org/release-group/${result.metadata.releaseGroup}`,
        label: 'MusicBrainz',
        domain: 'musicbrainz.org',
      });
      return links;
    }

    links.push({
      href: `https://musicbrainz.org/release/${result.metadata.mbid}`,
      label: 'MusicBrainz',
      domain: 'musicbrainz.org',
    });
  }

  if (mediaType === 'games') {
    links.push({
      href: `https://thegamesdb.net/game.php?id=${result.id}`,
      label: 'TheGamesDB',
      domain: 'thegamesdb.net',
    });
  }

  return links;
};

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
              imageUrl={result.coverThumbnailUrl || result.coverUrl || undefined}
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
          Add {showMoreCount} more
        </button>
      </div>
    )}
  </div>
);
