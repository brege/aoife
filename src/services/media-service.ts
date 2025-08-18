// Media service interfaces

export interface MediaSearchResult {
  id: string | number;
  title: string;
  subtitle?: string;
  year?: number;
  coverUrl?: string | null;
  metadata?: Record<string, unknown>;
}

export abstract class MediaService {
  abstract search(query: string): Promise<MediaSearchResult[]>;
  abstract getAlternateCovers(id: string | number): Promise<string[]>;
  abstract getDetails(id: string | number): Promise<MediaSearchResult | null>;
}