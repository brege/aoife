import { getImage, createBlobURL } from '../lib/indexeddb';
import { type MediaSearchResult, MediaService } from './service';
import { type MediaSearchValues } from './types';

export class CustomMediaService extends MediaService {
  async search(values: MediaSearchValues): Promise<MediaSearchResult[]> {
    let title = values.query || values.title;
    const coverUrl = values.cover || '';

    if (!title && !coverUrl) {
      return [];
    }

    let processedCoverUrl = coverUrl;
    if (coverUrl.startsWith('img-')) {
      const blob = await getImage(coverUrl);
      if (blob) {
        processedCoverUrl = createBlobURL(blob);
      }

      if (!title) {
        const parts = coverUrl.split('-');
        const filename = parts.slice(2).join('-');
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
        title = nameWithoutExt || 'Custom Item';
      }
    }

    if (!title) {
      title = 'Custom Item';
    }

    return [
      {
        id: `custom-${Date.now()}`,
        title,
        type: 'custom' as const,
        coverUrl: processedCoverUrl,
        coverThumbnailUrl: processedCoverUrl,
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
