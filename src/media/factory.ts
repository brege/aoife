import { BooksService } from './books';
import { GamesService } from './games';
import { MusicService } from './music';
import type { MediaService } from './service';
import { TMDBService } from './tmdb';
import type { MediaType } from './types';

type ServiceCache = Partial<Record<MediaType, MediaService>>;

const serviceCache: ServiceCache = {};

export function getMediaService(mediaType: MediaType): MediaService {
  if (serviceCache[mediaType]) {
    return serviceCache[mediaType] as MediaService;
  }

  let service: MediaService;

  switch (mediaType) {
    case 'movies': {
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;
      if (!apiKey) {
        throw new Error('TMDB API key not configured');
      }
      service = new TMDBService(apiKey, 'movies');
      break;
    }

    case 'tv': {
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;
      if (!apiKey) {
        throw new Error('TMDB API key not configured');
      }
      service = new TMDBService(apiKey, 'tv');
      break;
    }

    case 'books':
      service = new BooksService();
      break;

    case 'music':
      service = new MusicService();
      break;

    case 'games':
      service = new GamesService();
      break;

    default:
      throw new Error(`Unsupported media type: ${mediaType}`);
  }

  serviceCache[mediaType] = service;
  return service;
}
