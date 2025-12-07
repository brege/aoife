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
      service = new TMDBService(apiKey);
      break;
    }

    case 'books':
      throw new Error('Books service not yet implemented');

    case 'music':
      throw new Error('Music service not yet implemented');

    default:
      throw new Error(`Unsupported media type: ${mediaType}`);
  }

  serviceCache[mediaType] = service;
  return service;
}
