import type { MediaItem, MediaType } from '../../../providers/types';

export type ExternalLink = {
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

export const getExternalLinks = (
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
