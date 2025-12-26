import axios from 'axios';
import logger from '../lib/logger';
import {
  TmdbDetailsSchema,
  TmdbImagesResponseSchema,
  TmdbSearchResponseSchema,
  type TmdbResult,
} from './schemas';
import { type MediaSearchResult, MediaService } from './service';
import { type MediaSearchValues, TMDB_IMAGE_BASE } from './types';

const buildPosterUrl = (
  path?: string | null,
  size: 'w92' | 'w200' | 'w300' | 'w500' | 'w780' | 'original' = 'w500',
) => {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

export class TMDBService extends MediaService {
  private readonly baseUrl: string;
  private readonly mediaType: 'movies' | 'tv';

  constructor(_apiKey: string, mediaType: 'movies' | 'tv' = 'movies') {
    super();
    this.mediaType = mediaType;
    const serverBase =
      typeof window === 'undefined'
        ? process.env.AOIFE_API_BASE || process.env.VITE_DEV_SERVER_ORIGIN
        : '';
    if (typeof window === 'undefined' && !serverBase) {
      throw new Error('Missing AOIFE_API_BASE or VITE_DEV_SERVER_ORIGIN');
    }
    this.baseUrl = `${serverBase}/api/tmdb`;
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
        `${this.baseUrl}/3/${this.getSearchEndpoint()}`,
        {
          params: {
            query: query,
          },
        },
      );

      const parsed = TmdbSearchResponseSchema.parse(response.data);

      const results = await Promise.all(
        parsed.results.map(async (item: TmdbResult) => {
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
            coverUrl: buildPosterUrl(item.poster_path, 'w780'),
            coverThumbnailUrl: buildPosterUrl(item.poster_path, 'w200'),
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
      const errorToLog =
        error instanceof Error ? error : new Error(String(error));
      logger.error(
        {
          error: errorToLog,
          mediaType: this.mediaType,
        },
        'TMDB search failed',
      );
      throw new Error(`Failed to search ${this.mediaType}`);
    }
  }

  async getDetails(id: string | number): Promise<MediaSearchResult | null> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/3/${this.getDetailsEndpoint(id)}`,
      );

      const data = TmdbDetailsSchema.parse(response.data);
      const dateField = this.getDateField(data);
      return {
        id: data.id,
        title: this.getTitleField(data),
        subtitle: dateField
          ? new Date(dateField).getFullYear().toString()
          : undefined,
        year: dateField ? new Date(dateField).getFullYear() : undefined,
        type: this.mediaType,
        coverUrl: buildPosterUrl(data.poster_path, 'w780'),
        coverThumbnailUrl: buildPosterUrl(data.poster_path, 'w200'),
        metadata: {
          release_date: dateField,
          poster_path: data.poster_path,
          imdb_id: data.imdb_id,
          isCustom: false,
        },
      };
    } catch (error) {
      const errorToLog =
        error instanceof Error ? error : new Error(String(error));
      logger.error(
        {
          error: errorToLog,
          mediaType: this.mediaType,
          id,
        },
        'TMDB details fetch failed',
      );
      return null;
    }
  }

  async getAlternateCovers(id: string | number): Promise<string[]> {
    try {
      const endpoint = `${this.baseUrl}/3/${this.getImagesEndpoint(id)}`;
      const response = await axios.get(endpoint);

      const parsed = TmdbImagesResponseSchema.parse(response.data);

      if (!parsed.posters) {
        return [];
      }

      return parsed.posters
        .map((poster) => buildPosterUrl(poster.file_path, 'w500'))
        .filter((url): url is string => Boolean(url));
    } catch (error) {
      const errorToLog =
        error instanceof Error ? error : new Error(String(error));
      logger.error(
        {
          error: errorToLog,
          mediaType: this.mediaType,
          id,
          endpoint: `${this.baseUrl}/3/${this.getImagesEndpoint(id)}`,
        },
        'TMDB alternate posters fetch failed',
      );
      return [];
    }
  }
}
