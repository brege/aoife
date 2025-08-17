import axios from 'axios';
import { MediaService, MediaSearchResult } from './media-service';

export class TMDBService extends MediaService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.themoviedb.org/3';

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  async search(query: string): Promise<MediaSearchResult[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/search/movie`, {
        params: {
          api_key: this.apiKey,
          query: query,
        },
      });

      // Fetch movie details including imdb_id for each search result
      const moviesWithImdb = await Promise.all(
        response.data.results.map(async (movie: any) => {
          const details = await this.getDetails(movie.id);
          return {
            id: movie.id,
            title: movie.title,
            subtitle: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : undefined,
            year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
            coverUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
            metadata: {
              release_date: movie.release_date,
              poster_path: movie.poster_path,
              imdb_id: details?.metadata?.imdb_id || null,
              isCustom: false,
            }
          };
        })
      );

      return moviesWithImdb;
    } catch (error) {
      console.error('TMDB search error:', error);
      throw new Error('Failed to search movies');
    }
  }

  async getDetails(id: string | number): Promise<MediaSearchResult | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/movie/${id}`, {
        params: {
          api_key: this.apiKey,
        },
      });

      const data = response.data;
      return {
        id: data.id,
        title: data.title,
        subtitle: data.release_date ? new Date(data.release_date).getFullYear().toString() : undefined,
        year: data.release_date ? new Date(data.release_date).getFullYear() : undefined,
        coverUrl: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
        metadata: {
          release_date: data.release_date,
          poster_path: data.poster_path,
          imdb_id: data.imdb_id,
          isCustom: false,
        }
      };
    } catch (error) {
      console.error(`Error fetching details for movie ${id}:`, error);
      return null;
    }
  }

  async getAlternateCovers(id: string | number): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/movie/${id}/images`, {
        params: {
          api_key: this.apiKey,
        },
      });
      return response.data.posters.map((poster: { file_path: string }) => poster.file_path);
    } catch (error) {
      console.error('Error fetching alternate posters:', error);
      return [];
    }
  }
}