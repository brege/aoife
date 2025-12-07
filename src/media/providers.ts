import type { MediaProviderConfig, MediaType } from './types';

const tmdbProvider: MediaProviderConfig = {
  type: 'movies',
  id: 'tmdb-movies',
  label: 'Movies',
  description: 'Search feature films via The Movie Database (TMDB) cover API.',
  resultLabel: 'movie',
  searchFields: [
    {
      id: 'query',
      label: 'Movie Title',
      placeholder: 'Search for a movie...',
      type: 'text',
      required: true,
      description: 'Uses TMDB search API on original title and common aliases.',
    },
  ],
  defaultSearchValues: {
    query: '',
  },
  supportsCustomEntries: true,
  supportsAlternateCovers: true,
};

const booksProvider: MediaProviderConfig = {
  type: 'books',
  id: 'book-covers',
  label: 'Books',
  description: 'Placeholder for Book Covers API (OpenLibrary + Google Books).',
  resultLabel: 'book',
  searchFields: [
    {
      id: 'title',
      label: 'Title',
      placeholder: 'Search for a book title...',
      type: 'text',
      required: true,
    },
    {
      id: 'author',
      label: 'Author',
      placeholder: 'Author name',
      type: 'text',
      required: false,
    },
  ],
  defaultSearchValues: {
    title: '',
    author: '',
  },
  supportsCustomEntries: true,
  supportsAlternateCovers: true,
};

const musicProvider: MediaProviderConfig = {
  type: 'music',
  id: 'music-placeholder',
  label: 'Music',
  description: 'Placeholder for future music cover integrations.',
  resultLabel: 'album',
  searchFields: [
    {
      id: 'query',
      label: 'Album or Artist',
      placeholder: 'Search for an album...',
      type: 'text',
      required: true,
    },
  ],
  defaultSearchValues: {
    query: '',
  },
  supportsCustomEntries: true,
  supportsAlternateCovers: false,
};

export const mediaProviders: Record<MediaType, MediaProviderConfig> = {
  movies: tmdbProvider,
  books: booksProvider,
  music: musicProvider,
};

export function getMediaProvider(mediaType: MediaType): MediaProviderConfig {
  return mediaProviders[mediaType];
}
