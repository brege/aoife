/// <reference types="vite/client" />

import { BooksService } from './books';
import { CustomMediaService } from './custom';
import { GamesService } from './games';
import { MusicService } from './music';
import type { MediaService } from './service';
import { TMDBService } from './tmdb';
import type { MediaType } from './types';

function getTmdbKey(): string {
  const metaEnv =
    typeof import.meta !== 'undefined'
      ? (import.meta as ImportMeta).env
      : undefined;
  const nodeEnv = typeof process !== 'undefined' ? process.env : undefined;
  return metaEnv?.TMDB_API_KEY || nodeEnv?.TMDB_API_KEY || '';
}

export function getMediaService(mediaType: MediaType): MediaService {
  switch (mediaType) {
    case 'movies':
      return new TMDBService(getTmdbKey(), 'movies');

    case 'tv':
      return new TMDBService(getTmdbKey(), 'tv');

    case 'books':
      return new BooksService();

    case 'music':
      return new MusicService();

    case 'games':
      return new GamesService();

    case 'custom':
      return new CustomMediaService();

    default:
      throw new Error(`Unsupported media type: ${mediaType}`);
  }
}
