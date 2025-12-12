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
  original: string;
  small: string;
  thumb: string;
  cropped_center_thumb: string;
  medium: string;
  large: string;
};

type GameImagesResponse = {
  data: {
    base_url?: ImageBaseUrl;
    images?: Record<string, GameImage[]>;
  };
};

export class GamesService extends MediaService {
  private readonly baseUrl = '/api/gamesdb/v1';
  private readonly imageBaseUrl = 'https://cdn.thegamesdb.net/images';

  async search(values: MediaSearchValues): Promise<MediaSearchResult[]> {
    const query = values.query || values.title;
    if (!query) {
      return [];
    }

    const params: Record<string, string> = { name: query };
    if (values.platform) {
      params.filter = `platform=${values.platform}`;
    }

    const response = await axios.get(`${this.baseUrl}/Games/ByGameName`, {
      params,
    });

    if (!response.data.data?.games) {
      return [];
    }

    const gameList = response.data.data.games as Game[];

    const fetchImageUrl = async (gameId: number): Promise<string | null> => {
      try {
        const imageResponse = await axios.get(`${this.baseUrl}/Games/Images`, {
          params: { games_id: gameId },
        });

        const imageData = imageResponse.data.data as GameImagesResponse['data'];
        if (!imageData?.images?.[gameId.toString()]) {
          return null;
        }

        const images = imageData.images[gameId.toString()];
        const boxart = images.find(
          (image) => image.type === 'boxart' && image.side === 'front',
        );

        if (boxart && imageData.base_url) {
          return `${imageData.base_url.large}${boxart.filename}`;
        }
      } catch {
        return null;
      }
      return null;
    };

    const concurrencyLimit = 5;
    const imagePromises = gameList.map((game) => fetchImageUrl(game.id));
    const imageUrls = await this.promiseLimit(concurrencyLimit, imagePromises);

    const results = gameList.map((game, index) => {
      const year = game.release_date
        ? new Date(game.release_date).getFullYear()
        : undefined;

      return {
        id: game.id,
        title: game.game_title,
        subtitle: year ? year.toString() : undefined,
        year,
        type: 'games' as const,
        coverUrl: imageUrls[index],
        coverThumbnailUrl: imageUrls[index],
        metadata: {
          release_date: game.release_date,
          isCustom: false,
        },
      };
    });

    return results;
  }

  async getDetails(id: string | number): Promise<MediaSearchResult | null> {
    const response = await axios.get(`${this.baseUrl}/Games/ByGameID`, {
      params: { id },
    });

    if (!response.data.data?.games || !response.data.data.games[0]) {
      return null;
    }

    const game = response.data.data.games[0] as Game;
    const year = game.release_date
      ? new Date(game.release_date).getFullYear()
      : undefined;

    const coverUrl = await this.getBoxart(Number(id), 'front');

    return {
      id: game.id,
      title: game.game_title,
      subtitle: year ? year.toString() : undefined,
      year,
      type: 'games' as const,
      coverUrl,
      coverThumbnailUrl: coverUrl,
      metadata: {
        overview: game.overview,
        rating: game.rating,
        release_date: game.release_date,
        isCustom: false,
      },
    };
  }

  async getAlternateCovers(id: string | number): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/Games/Images`, {
        params: { games_id: id },
      });

      const imageData = response.data.data as GameImagesResponse['data'];
      if (!imageData?.images) {
        return [];
      }

      const boxarts = imageData.images[id as string] || [];
      return boxarts
        .filter((image) => image.type === 'boxart')
        .map(
          (image) =>
            `${this.imageBaseUrl}/boxart/${image.side}/${image.filename}`,
        )
        .slice(0, 10);
    } catch {
      return [];
    }
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

  private async getBoxart(
    id: number,
    side: 'front' | 'back' = 'front',
  ): Promise<string | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/Games/Images`, {
        params: { games_id: id },
      });

      const imageData = response.data.data as GameImagesResponse['data'];
      if (!imageData?.images) {
        return null;
      }

      const boxarts = imageData.images[id.toString()] || [];
      const boxart = boxarts.find(
        (image) => image.type === 'boxart' && image.side === side,
      );

      return boxart
        ? `${this.imageBaseUrl}/boxart/${boxart.side}/${boxart.filename}`
        : null;
    } catch {
      return null;
    }
  }
}
