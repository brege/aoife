import { MediaType } from '../types/media';
import { MediaService } from './media-service';
import { TMDBService } from './tmdb-service';

export class MediaServiceFactory {
  private static tmdbService: TMDBService | null = null;

  static getService(mediaType: MediaType): MediaService {
    switch (mediaType) {
      case 'movies':
        if (!this.tmdbService) {
          const apiKey = import.meta.env.VITE_TMDB_API_KEY;
          if (!apiKey) {
            throw new Error('TMDB API key not configured');
          }
          this.tmdbService = new TMDBService(apiKey);
        }
        return this.tmdbService;
      
      case 'books':
        throw new Error('Books service not yet implemented');
      
      case 'music':
        throw new Error('Music service not yet implemented');
      
      default:
        throw new Error(`Unsupported media type: ${mediaType}`);
    }
  }
}