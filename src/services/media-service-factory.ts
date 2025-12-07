import { MediaType } from '../types/media';
import { MediaService } from './media-service';
import { TMDBService } from './tmdb-service';

type ServiceCache = Partial<Record<MediaType, MediaService>>;

const serviceCache: ServiceCache = {};

export class MediaServiceFactory {
  static getService(mediaType: MediaType): MediaService {
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
}
