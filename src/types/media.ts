export interface Movie {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  isCustom?: boolean;
  imdb_id?: string | null;
}

export interface MediaItem {
  id: string | number;
  type: 'movie' | 'tv' | 'book' | 'game' | 'album';
  title: string;
  subtitle?: string;
  year?: number;
  coverUrl?: string | null;
  alternateCovers?: string[];
  customEntry?: boolean;
  metadata?: Record<string, unknown>;
}