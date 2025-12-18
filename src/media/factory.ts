/// <reference types="vite/client" />

import { BooksService } from './books';
import { CustomMediaService } from './custom';
import { GamesService } from './games';
import { MusicService } from './music';
import type { MediaService } from './service';
import { TMDBService } from './tmdb';
import type { MediaType } from './types';

type ServiceCache = Partial<Record<MediaType, MediaService>>;

const serviceCache: ServiceCache = {};

function getTmdbKey(): string {
  const metaEnv =
    typeof import.meta !== 'undefined'
      ? (import.meta as ImportMeta).env
      : undefined;
  return (
    metaEnv?.VITE_TMDB_API_KEY ||
    process.env.VITE_TMDB_API_KEY ||
    process.env.TMDB_API_KEY ||
    ''
  );
}

export function getMediaService(mediaType: MediaType): MediaService {
  if (serviceCache[mediaType]) {
    return serviceCache[mediaType] as MediaService;
  }

  let service: MediaService;

  switch (mediaType) {
    case 'movies':
      service = new TMDBService(getTmdbKey(), 'movies');
      break;

    case 'tv':
      service = new TMDBService(getTmdbKey(), 'tv');
      break;

    case 'books':
      service = new BooksService();
      break;

    case 'music':
      service = new MusicService();
      break;

    case 'games':
      service = new GamesService();
      break;

    case 'custom':
      service = new CustomMediaService();
      break;

    default:
      throw new Error(`Unsupported media type: ${mediaType}`);
  }

  serviceCache[mediaType] = service;
  return service;
}
