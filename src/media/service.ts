import { MediaItem, MediaSearchValues } from './types';

export type MediaSearchResult = MediaItem;

export abstract class MediaService {
  abstract search(values: MediaSearchValues): Promise<MediaSearchResult[]>;
  abstract getAlternateCovers(id: string | number): Promise<string[]>;
  abstract getDetails(id: string | number): Promise<MediaSearchResult | null>;
}
