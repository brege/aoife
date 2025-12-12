export type MediaType =
  | 'movies'
  | 'tv'
  | 'books'
  | 'music'
  | 'games'
  | 'custom';

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export interface MediaSearchField {
  id: string;
  label: string;
  placeholder: string;
  type: 'text';
  required?: boolean;
  description?: string;
}

export type MediaSearchValues = Record<string, string>;

export interface MediaItem {
  id: string | number;
  type: MediaType | string;
  title: string;
  subtitle?: string;
  year?: number;
  coverUrl?: string | null;
  coverThumbnailUrl?: string | null;
  alternateCoverUrls?: string[];
  source?: string;
  customEntry?: boolean;
  metadata?: Record<string, unknown>;
  aspectRatio?: number;
}

export type AspectRatio = '2:3' | '1:1' | 'auto';

export interface MediaProviderConfig {
  type: MediaType;
  id: string;
  label: string;
  description?: string;
  resultLabel: string;
  searchFields: MediaSearchField[];
  defaultSearchValues: MediaSearchValues;
  supportsCustomEntries: boolean;
  supportsAlternateCovers: boolean;
  aspectRatio: AspectRatio;
}
