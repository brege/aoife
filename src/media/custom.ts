import { type MediaSearchResult, MediaService } from './service';
import { type MediaSearchValues } from './types';

export class CustomMediaService extends MediaService {
  async search(values: MediaSearchValues): Promise<MediaSearchResult[]> {
    const title = values.query || values.title;
    if (!title) {
      return [];
    }

    const coverUrl = values.cover || '';

    return [
      {
        id: `custom-${Date.now()}`,
        title,
        type: 'custom' as const,
        coverUrl,
        coverThumbnailUrl: coverUrl,
        metadata: {
          isCustom: true,
        },
      },
    ];
  }

  async getDetails(id: string | number): Promise<MediaSearchResult | null> {
    return null;
  }

  async getAlternateCovers(id: string | number): Promise<string[]> {
    return [];
  }
}
