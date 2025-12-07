import axios from 'axios';
import { type MediaSearchResult, MediaService } from './service';
import { type MediaSearchValues, TMDB_IMAGE_BASE } from './types';

type TmdbMovieResult = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
};

type TmdbMovieDetails = TmdbMovieResult & {
  imdb_id?: string | null;
};

const buildPosterUrl = (
  path?: string | null,
  size: 'w92' | 'w200' | 'w300' | 'w500' | 'original' = 'w500',
) => {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

export class TMDBService extends MediaService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.themoviedb.org/3';

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  async search(values: MediaSearchValues): Promise<MediaSearchResult[]> {
    try {
      const query = values.query || values.title;
      if (!query) {
        return [];
      }

      const response = await axios.get(`${this.baseUrl}/search/movie`, {
        params: {
          api_key: this.apiKey,
          query: query,
        },
      });

      const moviesWithImdb = await Promise.all(
        response.data.results.map(async (movie: TmdbMovieResult) => {
          const details = await this.getDetails(movie.id);
          return {
            id: movie.id,
            title: movie.title,
            subtitle: movie.release_date
              ? new Date(movie.release_date).getFullYear().toString()
              : undefined,
            year: movie.release_date
              ? new Date(movie.release_date).getFullYear()
              : undefined,
            type: 'movies',
            coverUrl: buildPosterUrl(movie.poster_path, 'w500'),
            coverThumbnailUrl: buildPosterUrl(movie.poster_path, 'w92'),
            metadata: {
              release_date: movie.release_date,
              poster_path: movie.poster_path,
              imdb_id: details?.metadata?.imdb_id || null,
              isCustom: false,
            },
          };
        }),
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

      const data: TmdbMovieDetails = response.data;
      return {
        id: data.id,
        title: data.title,
        subtitle: data.release_date
          ? new Date(data.release_date).getFullYear().toString()
          : undefined,
        year: data.release_date
          ? new Date(data.release_date).getFullYear()
          : undefined,
        type: 'movies',
        coverUrl: buildPosterUrl(data.poster_path, 'w500'),
        coverThumbnailUrl: buildPosterUrl(data.poster_path, 'w92'),
        metadata: {
          release_date: data.release_date,
          poster_path: data.poster_path,
          imdb_id: data.imdb_id,
          isCustom: false,
        },
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
      return response.data.posters
        .map((poster: { file_path: string }) =>
          buildPosterUrl(poster.file_path, 'w500'),
        )
        .filter((url: string | null): url is string => Boolean(url));
    } catch (error) {
      console.error('Error fetching alternate posters:', error);
      return [];
    }
  }
}
