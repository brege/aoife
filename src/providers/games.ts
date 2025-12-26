import axios from 'axios';
import logger from '../lib/logger';
import {
  GamesImagesResponseSchema,
  GamesSearchResponseSchema,
  type ImageBaseUrl,
} from './schemas';
import { type MediaSearchResult, MediaService } from './service';
import type { MediaSearchValues } from './types';

interface SearchCache {
  params: string;
  results: MediaSearchResult[];
  timestamp: number;
}

export class GamesService extends MediaService {
  private readonly baseUrl = '/api/gamesdb/v1';
  private readonly imageBaseUrl = '/api/gamesdb/images';
  private searchCache: SearchCache | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000;
  private itemToSearchParams = new Map<string | number, string>();

  async search(values: MediaSearchValues): Promise<MediaSearchResult[]> {
    const query = values.query || values.title;
    const platform = values.platform || '';
    if (!query) {
      return [];
    }

    const cacheKey = `${query}|${platform}`;

    // Check cache
    if (
      this.searchCache &&
      this.searchCache.params === cacheKey &&
      Date.now() - this.searchCache.timestamp < this.CACHE_TTL
    ) {
      return this.searchCache.results;
    }

    const params: Record<string, string> = { name: query };
    if (platform) {
      params[`filter[platform]`] = platform;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/Games/ByGameName`, {
        params,
      });

      const parsed = GamesSearchResponseSchema.parse(response.data);

      if (!parsed.data.games) {
        return [];
      }

      const gameList = parsed.data.games;

      const buildImageUrl = (
        baseUrl: ImageBaseUrl | undefined,
        filename: string,
        size: keyof ImageBaseUrl = 'original',
      ): string => {
        if (filename.startsWith('http://') || filename.startsWith('https://')) {
          return filename;
        }

        const base = baseUrl?.[size] ?? baseUrl?.original;
        if (base) {
          return `${base}/${filename}`;
        }

        return `${this.imageBaseUrl}/${filename}`;
      };

      const fetchImagesForGames = async (
        gameIds: number[],
      ): Promise<Record<number, { full?: string; thumb?: string }>> => {
        if (gameIds.length === 0) {
          return {};
        }

        try {
          const imageResponse = await axios.get(
            `${this.baseUrl}/Games/Images`,
            {
              params: {
                games_id: gameIds.join(','),
              },
            },
          );

          const parsedImages = GamesImagesResponseSchema.parse(
            imageResponse.data,
          );
          const baseUrl = parsedImages.data.base_url;
          const imagesByGame = parsedImages.data.images ?? {};
          const mapped: Record<number, { full?: string; thumb?: string }> = {};

          gameIds.forEach((gameId) => {
            const imageList = imagesByGame[gameId.toString()];
            if (!imageList) {
              return;
            }
            const boxart = imageList.find(
              (image) => image.type === 'boxart' && image.side === 'front',
            );
            const firstBox =
              boxart ?? imageList.find((img) => img.type === 'boxart');
            if (!firstBox) {
              return;
            }
            mapped[gameId] = {
              full: buildImageUrl(baseUrl, firstBox.filename, 'original'),
              thumb: buildImageUrl(baseUrl, firstBox.filename, 'medium'),
            };
          });

          return mapped;
        } catch {
          return {};
        }
      };

      const imageUrls = await fetchImagesForGames(
        gameList.map((game) => game.id),
      );

      const results = gameList.map((game) => {
        const year = game.release_date
          ? new Date(game.release_date).getFullYear()
          : undefined;

        const image = imageUrls[game.id] ?? {};

        const mapped = {
          id: game.id,
          title: game.game_title,
          subtitle: year ? year.toString() : undefined,
          year,
          type: 'games' as const,
          coverUrl: image.full,
          coverThumbnailUrl: image.thumb ?? image.full,
          metadata: {
            release_date: game.release_date,
            isCustom: false,
          },
        };
        return mapped;
      });

      // Cache all results
      this.searchCache = {
        params: cacheKey,
        results,
        timestamp: Date.now(),
      };

      // Map each item ID to its search params for later lookup
      results.forEach((item) => {
        this.itemToSearchParams.set(item.id, cacheKey);
      });

      return results;
    } catch (error) {
      const errorToLog =
        error instanceof Error ? error : new Error(String(error));
      logger.error(
        {
          error: errorToLog,
        },
        'Games search failed',
      );
      throw new Error('Failed to search games');
    }
  }

  async getDetails(_id: string | number): Promise<MediaSearchResult | null> {
    return null;
  }

  async getAlternateCovers(id: string | number): Promise<string[]> {
    const cacheKey = this.itemToSearchParams.get(id);
    if (!cacheKey) {
      return [];
    }

    if (
      this.searchCache &&
      this.searchCache.params === cacheKey &&
      Date.now() - this.searchCache.timestamp < this.CACHE_TTL
    ) {
      const otherResults = this.searchCache.results.filter(
        (item) => item.id !== id,
      );
      return otherResults
        .filter((item) => item.coverUrl)
        .map((item) => item.coverUrl as string);
    }

    return [];
  }
}
