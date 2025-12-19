import type { MediaProviderConfig, MediaType } from './types';

const tmdbMoviesProvider: MediaProviderConfig = {
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
  aspectRatio: '2:3',
};

const tmdbTvProvider: MediaProviderConfig = {
  type: 'tv',
  id: 'tmdb-tv',
  label: 'TV Shows',
  description: 'Search TV shows via The Movie Database (TMDB) cover API.',
  resultLabel: 'tv show',
  searchFields: [
    {
      id: 'query',
      label: 'TV Show Title',
      placeholder: 'Search for a TV show...',
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
  aspectRatio: '2:3',
};

const booksProvider: MediaProviderConfig = {
  type: 'books',
  id: 'book-covers',
  label: 'Books',
  description: 'Search via OpenLibrary + Google Books.',
  resultLabel: 'book',
  searchFields: [
    {
      id: 'author',
      label: 'Author',
      placeholder: 'Author...',
      type: 'text',
      required: false,
    },
    {
      id: 'title',
      label: 'Title',
      placeholder: 'Title...',
      type: 'text',
      required: true,
    },
  ],
  defaultSearchValues: {
    title: '',
    author: '',
  },
  supportsCustomEntries: true,
  supportsAlternateCovers: true,
  aspectRatio: 'auto',
};

const musicProvider: MediaProviderConfig = {
  type: 'music',
  id: 'musicbrainz',
  label: 'Music',
  description:
    'Search albums via MusicBrainz. Cover art from Cover Art Archive and iTunes.',
  resultLabel: 'album',
  searchFields: [
    {
      id: 'artist',
      label: 'Artist',
      placeholder: 'Artist...',
      type: 'text',
      required: false,
    },
    {
      id: 'album',
      label: 'Album',
      placeholder: 'Album...',
      type: 'text',
      required: false,
    },
  ],
  defaultSearchValues: {
    artist: '',
    album: '',
  },
  supportsCustomEntries: true,
  supportsAlternateCovers: true,
  aspectRatio: '1:1',
};

const gamesProvider: MediaProviderConfig = {
  type: 'games',
  id: 'thegamesdb-games',
  label: 'Games',
  description:
    'Search video games via The Games Database (TGDB) with platform filtering.',
  resultLabel: 'game',
  searchFields: [
    {
      id: 'query',
      label: 'Game Title',
      placeholder: 'Search for a game...',
      type: 'text',
      required: true,
    },
    {
      id: 'platform',
      label: 'Platform',
      placeholder: 'Platform...',
      type: 'text',
      required: false,
      description: 'Filter by platform (optional)',
    },
  ],
  defaultSearchValues: {
    query: '',
    platform: '',
  },
  supportsCustomEntries: true,
  supportsAlternateCovers: true,
  aspectRatio: 'auto',
};

const customProvider: MediaProviderConfig = {
  type: 'custom',
  id: 'custom-media',
  label: 'Custom',
  description: 'Add your own media with a name and cover image.',
  resultLabel: 'custom item',
  searchFields: [
    {
      id: 'query',
      label: 'Name',
      placeholder: 'Name (optional)',
      type: 'text',
      required: false,
    },
    {
      id: 'cover',
      label: 'Cover Image',
      placeholder: 'Image URL or upload...',
      type: 'text',
      required: false,
    },
  ],
  defaultSearchValues: {
    query: '',
    cover: '',
  },
  supportsCustomEntries: false,
  supportsAlternateCovers: false,
  aspectRatio: 'auto',
};

export const mediaProviders: Record<MediaType, MediaProviderConfig> = {
  movies: tmdbMoviesProvider,
  tv: tmdbTvProvider,
  books: booksProvider,
  music: musicProvider,
  games: gamesProvider,
  custom: customProvider,
};

export function getMediaProvider(mediaType: MediaType): MediaProviderConfig {
  return mediaProviders[mediaType];
}
