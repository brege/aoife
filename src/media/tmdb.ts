import axios from 'axios';
import { type MediaSearchResult, MediaService } from './service';
import { type MediaSearchValues, TMDB_IMAGE_BASE } from './types';

type TmdbResult = {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
};

type TmdbDetails = TmdbResult & {
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
  private readonly baseUrl = 'https://api.themoviedb.org/3';
  private readonly apiKey: string;
  private readonly mediaType: 'movies' | 'tv';

  constructor(apiKey?: string, mediaType: 'movies' | 'tv' = 'movies') {
    super();
    this.mediaType = mediaType;
    this.apiKey = apiKey || import.meta.env.VITE_TMDB_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('VITE_TMDB_API_KEY is required for TMDB searches');
    }
  }

  private getSearchEndpoint(): string {
    return this.mediaType === 'tv' ? 'search/tv' : 'search/movie';
  }

  private getDetailsEndpoint(id: string | number): string {
    return this.mediaType === 'tv' ? `tv/${id}` : `movie/${id}`;
  }

  private getImagesEndpoint(id: string | number): string {
    return this.mediaType === 'tv' ? `tv/${id}/images` : `movie/${id}/images`;
  }

  private getTitleField(item: TmdbResult): string {
    return this.mediaType === 'tv' ? item.name || '' : item.title || '';
  }

  private getDateField(item: TmdbResult): string | undefined {
    return this.mediaType === 'tv' ? item.first_air_date : item.release_date;
  }

  async search(values: MediaSearchValues): Promise<MediaSearchResult[]> {
    try {
      const query = values.query || values.title;
      if (!query) {
        return [];
      }

      const response = await axios.get(
        `${this.baseUrl}/${this.getSearchEndpoint()}`,
        {
          params: {
            query: query,
            api_key: this.apiKey,
          },
        },
      );

      const results = await Promise.all(
        response.data.results.map(async (item: TmdbResult) => {
          const details = await this.getDetails(item.id);
          const dateField = this.getDateField(item);
          return {
            id: item.id,
            title: this.getTitleField(item),
            subtitle: dateField
              ? new Date(dateField).getFullYear().toString()
              : undefined,
            year: dateField ? new Date(dateField).getFullYear() : undefined,
            type: this.mediaType,
            coverUrl: buildPosterUrl(item.poster_path, 'w500'),
            coverThumbnailUrl: buildPosterUrl(item.poster_path, 'w92'),
            metadata: {
              release_date: dateField,
              poster_path: item.poster_path,
              imdb_id: details?.metadata?.imdb_id || null,
              isCustom: false,
            },
          };
        }),
      );

      return results;
    } catch (error) {
      console.error(`TMDB search error for ${this.mediaType}:`, error);
      throw new Error(`Failed to search ${this.mediaType}`);
    }
  }

  async getDetails(id: string | number): Promise<MediaSearchResult | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.getDetailsEndpoint(id)}`,
        {
          params: {
            api_key: this.apiKey,
          },
        },
      );

      const data: TmdbDetails = response.data;
      const dateField = this.getDateField(data);
      return {
        id: data.id,
        title: this.getTitleField(data),
        subtitle: dateField
          ? new Date(dateField).getFullYear().toString()
          : undefined,
        year: dateField ? new Date(dateField).getFullYear() : undefined,
        type: this.mediaType,
        coverUrl: buildPosterUrl(data.poster_path, 'w500'),
        coverThumbnailUrl: buildPosterUrl(data.poster_path, 'w92'),
        metadata: {
          release_date: dateField,
          poster_path: data.poster_path,
          imdb_id: data.imdb_id,
          isCustom: false,
        },
      };
    } catch (error) {
      console.error(
        `Error fetching details for ${this.mediaType} ${id}:`,
        error,
      );
      return null;
    }
  }

  async getAlternateCovers(id: string | number): Promise<string[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.getImagesEndpoint(id)}`,
        {
          params: {
            api_key: this.apiKey,
          },
        },
      );
      return response.data.posters
        .map((poster: { file_path: string }) =>
          buildPosterUrl(poster.file_path, 'w500'),
        )
        .filter((url: string | null): url is string => Boolean(url));
    } catch (error) {
      console.error(
        `Error fetching alternate posters for ${this.mediaType}:`,
        error,
      );
      return [];
    }
  }
}
