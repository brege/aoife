import axios from 'axios';
import { type MediaSearchResult, MediaService } from './service';
import type { MediaSearchValues } from './types';

type Game = {
  id: number;
  game_title: string;
  release_date?: string;
  overview?: string;
  rating?: number;
};

type GameImage = {
  id: number;
  type: string;
  side?: string;
  filename: string;
  resolution?: string;
};

type ImageBaseUrl = {
  original?: string;
  small?: string;
  thumb?: string;
  cropped_center_thumb?: string;
  medium?: string;
  large?: string;
};

type GameImagesResponse = {
  data: {
    base_url?: ImageBaseUrl;
    images?: Record<string, GameImage[]>;
  };
};

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
      return this.searchCache.results.slice(0, 25);
    }

    const params: Record<string, string> = { name: query };
    if (platform) {
      params[`filter[platform]`] = platform;
    }

    const response = await axios.get(`${this.baseUrl}/Games/ByGameName`, {
      params,
    });

    if (!response.data.data?.games) {
      return [];
    }

    const gameList = response.data.data.games as Game[];

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

    const fetchImageUrl = async (
      gameId: number,
    ): Promise<{ full?: string; thumb?: string }> => {
      try {
        const imageResponse = await axios.get(`${this.baseUrl}/Games/Images`, {
          params: { games_id: gameId },
        });

        const imageData = imageResponse.data.data as GameImagesResponse['data'];
        const baseUrl = imageData?.base_url;
        const imageList = imageData?.images?.[gameId.toString()];
        if (!imageList) return {};

        const boxart = imageList.find(
          (image) => image.type === 'boxart' && image.side === 'front',
        );
        const firstBox =
          boxart ?? imageList.find((img) => img.type === 'boxart');

        if (firstBox) {
          return {
            full: buildImageUrl(baseUrl, firstBox.filename, 'original'),
            thumb: buildImageUrl(baseUrl, firstBox.filename, 'medium'),
          };
        }
      } catch {
        return {};
      }
      return {};
    };

    const concurrencyLimit = 5;
    const imagePromises = gameList.map((game) => fetchImageUrl(game.id));
    const imageUrls = await this.promiseLimit(concurrencyLimit, imagePromises);

    const results = gameList.map((game, index) => {
      const year = game.release_date
        ? new Date(game.release_date).getFullYear()
        : undefined;

      const image = imageUrls[index] ?? {};

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

    return results.slice(0, 25);
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

  private async promiseLimit<T>(
    limit: number,
    promises: Promise<T>[],
  ): Promise<T[]> {
    const results: T[] = [];
    let current = 0;

    return new Promise((resolve, reject) => {
      const run = async () => {
        while (current < promises.length) {
          const index = current++;
          try {
            results[index] = await promises[index];
          } catch (e) {
            reject(e);
            return;
          }
        }

        if (current === promises.length) {
          resolve(results);
        }
      };

      for (let i = 0; i < Math.min(limit, promises.length); i++) {
        run();
      }
    });
  }
}
