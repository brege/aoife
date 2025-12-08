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
      id: 'title',
      label: 'Title',
      placeholder: 'Title...',
      type: 'text',
      required: true,
    },
    {
      id: 'author',
      label: 'Author',
      placeholder: 'Author...',
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
  aspectRatio: 'auto',
};

const musicProvider: MediaProviderConfig = {
  type: 'music',
  id: 'musicbrainz',
  label: 'Music',
  description:
    'Search albums via MusicBrainz. Cover art from Cover Art Archive, iTunes, Deezer.',
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

export const mediaProviders: Record<MediaType, MediaProviderConfig> = {
  movies: tmdbProvider,
  books: booksProvider,
  music: musicProvider,
};

export function getMediaProvider(mediaType: MediaType): MediaProviderConfig {
  return mediaProviders[mediaType];
}
