export type MediaType = 'movies' | 'books' | 'music';

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
}

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
}
