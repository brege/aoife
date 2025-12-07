import axios from 'axios';
import { type MediaSearchResult, MediaService } from './service';
import type { MediaSearchValues } from './types';

interface OpenLibraryResult {
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  edition_count?: number;
  language?: string[];
  has_fulltext?: boolean;
  key?: string;
  ia?: string[];
}

interface OpenLibrarySearchResponse {
  numFound: number;
  docs: OpenLibraryResult[];
}

interface GoogleBooksVolumeInfo {
  title?: string;
  authors?: string[];
  publishedDate?: string;
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
    medium?: string;
    large?: string;
  };
  description?: string;
  pageCount?: number;
  categories?: string[];
  language?: string;
  infoLink?: string;
  previewLink?: string;
  industryIdentifiers?: Array<{ type: string; identifier: string }>;
  averageRating?: number;
  ratingsCount?: number;
  publisher?: string;
}

interface GoogleBooksVolume {
  id: string;
  volumeInfo: GoogleBooksVolumeInfo;
}

interface GoogleBooksSearchResponse {
  totalItems: number;
  items?: GoogleBooksVolume[];
}

interface SearchCache {
  params: string;
  results: MediaSearchResult[];
  timestamp: number;
}

export class BooksService extends MediaService {
  private searchCache: SearchCache | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private itemToSearchParams = new Map<string | number, string>();

  async search(values: MediaSearchValues): Promise<MediaSearchResult[]> {
    const title = values.title || values.query || '';
    const author = values.author || '';

    if (!title) {
      return [];
    }

    const cacheKey = `${title}|${author}`;

    // Check cache
    if (
      this.searchCache &&
      this.searchCache.params === cacheKey &&
      Date.now() - this.searchCache.timestamp < this.CACHE_TTL
    ) {
      return this.searchCache.results.slice(0, 10);
    }

    try {
      const [olPage0, olPage1, gbPage0, gbPage1] = await Promise.all([
        this.searchOpenLibrary(title, author, 10, 0),
        this.searchOpenLibrary(title, author, 10, 10),
        this.searchGoogleBooks(title, author, 10, 0),
        this.searchGoogleBooks(title, author, 10, 10),
      ]);

      const openLibraryResults = [...olPage0, ...olPage1];
      const googleBooksResults = [...gbPage0, ...gbPage1];

      const allResults = [...openLibraryResults, ...googleBooksResults];

      const sortedResults = allResults.sort((a, b) => {
        if (a.coverUrl && !b.coverUrl) return -1;
        if (!a.coverUrl && b.coverUrl) return 1;
        return 0;
      });

      // Cache all results (not just top 10)
      this.searchCache = {
        params: cacheKey,
        results: sortedResults,
        timestamp: Date.now(),
      };

      // Map each item ID to its search params for later lookup
      sortedResults.forEach((item) => {
        this.itemToSearchParams.set(item.id, cacheKey);
      });

      return sortedResults.slice(0, 10);
    } catch (error) {
      console.error('Books search error:', error);
      throw new Error('Failed to search books');
    }
  }

  async getDetails(id: string | number): Promise<MediaSearchResult | null> {
    if (typeof id !== 'string') {
      return null;
    }

    if (id.startsWith('ol:')) {
      const workId = id.replace('ol:', '');
      return this.fetchOpenLibraryWork(workId);
    }

    if (id.startsWith('gb:')) {
      const volumeId = id.replace('gb:', '');
      return this.fetchGoogleBooksVolume(volumeId);
    }

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

  private async searchOpenLibrary(
    title: string,
    author: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<MediaSearchResult[]> {
    try {
      const searchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=${limit}&offset=${offset}`;
      const response = await axios.get<OpenLibrarySearchResponse>(searchUrl, {
        timeout: 5000,
      });

      return (response.data.docs || [])
        .map((doc) => {
          const coverId = doc.cover_i;
          return {
            id: coverId ? `ol:${coverId}` : `ol:${doc.key || doc.title}`,
            type: 'books',
            title: doc.title,
            subtitle: doc.author_name ? doc.author_name.join(', ') : undefined,
            year: doc.first_publish_year,
            coverUrl: coverId
              ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
              : null,
            coverThumbnailUrl: coverId
              ? `https://covers.openlibrary.org/b/id/${coverId}-S.jpg`
              : null,
            source: 'OpenLibrary',
            metadata: {
              coverId: coverId || null,
              openLibraryKey: doc.key,
              editionCount: doc.edition_count,
            },
          };
        })
        .filter((item) => item.title);
    } catch (error) {
      console.error('OpenLibrary search error:', error);
      return [];
    }
  }

  private async searchGoogleBooks(
    title: string,
    author: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<MediaSearchResult[]> {
    try {
      const query = `intitle:"${title}" inauthor:"${author}"`;
      const searchUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${limit}&startIndex=${offset}`;
      const response = await axios.get<GoogleBooksSearchResponse>(searchUrl, {
        timeout: 5000,
      });

      return (response.data.items || [])
        .map((item) => {
          const volumeInfo = item.volumeInfo;
          const publishedYear = volumeInfo.publishedDate
            ? parseInt(volumeInfo.publishedDate.substring(0, 4), 10)
            : undefined;

          const imageLinks = volumeInfo.imageLinks;
          const coverUrl =
            imageLinks?.large ||
            imageLinks?.medium ||
            imageLinks?.thumbnail ||
            null;

          return {
            id: `gb:${item.id}`,
            type: 'books',
            title: volumeInfo.title || 'Unknown',
            subtitle: volumeInfo.authors
              ? volumeInfo.authors.join(', ')
              : undefined,
            year: publishedYear,
            coverUrl: this.ensureHttps(coverUrl),
            coverThumbnailUrl: this.ensureHttps(imageLinks?.thumbnail),
            source: 'GoogleBooks',
            metadata: {
              volumeId: item.id,
              publishedDate: volumeInfo.publishedDate,
              description: volumeInfo.description,
              pageCount: volumeInfo.pageCount,
              language: volumeInfo.language,
            },
          };
        })
        .filter((item) => item.title);
    } catch (error) {
      console.error('GoogleBooks search error:', error);
      return [];
    }
  }

  private async fetchOpenLibraryWork(
    workId: string,
  ): Promise<MediaSearchResult | null> {
    try {
      const cleanWorkId = workId.startsWith('/works/')
        ? workId
        : `/works/${workId}`;
      const workUrl = `https://openlibrary.org${cleanWorkId}.json`;
      const response = await axios.get<{
        title?: string;
        first_publish_date?: string;
        covers?: number[];
        description?: string | { value: string };
        subjects?: string[];
      }>(workUrl, {
        timeout: 5000,
      });

      const work = response.data;
      const coverId = work.covers?.[0];

      if (!coverId) {
        return null;
      }

      return {
        id: `ol:${coverId}`,
        type: 'books',
        title: work.title || 'Unknown',
        year: work.first_publish_date
          ? parseInt(work.first_publish_date.substring(0, 4), 10)
          : undefined,
        coverUrl: `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`,
        coverThumbnailUrl: `https://covers.openlibrary.org/b/id/${coverId}-S.jpg`,
        source: 'OpenLibrary',
        metadata: {
          coverId,
          description:
            typeof work.description === 'string'
              ? work.description
              : work.description?.value,
          subjects: work.subjects,
        },
      };
    } catch (error) {
      console.error(`Error fetching OpenLibrary work:`, error);
      return null;
    }
  }

  private async fetchGoogleBooksVolume(
    volumeId: string,
  ): Promise<MediaSearchResult | null> {
    try {
      const apiUrl = `https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(volumeId)}`;
      const response = await axios.get<GoogleBooksVolume>(apiUrl, {
        timeout: 5000,
      });

      const volumeInfo = response.data.volumeInfo;
      const publishedYear = volumeInfo.publishedDate
        ? parseInt(volumeInfo.publishedDate.substring(0, 4), 10)
        : undefined;

      const imageLinks = volumeInfo.imageLinks;
      const coverUrl =
        imageLinks?.large ||
        imageLinks?.medium ||
        imageLinks?.thumbnail ||
        null;

      return {
        id: `gb:${volumeId}`,
        type: 'books',
        title: volumeInfo.title || 'Unknown',
        subtitle: volumeInfo.authors
          ? volumeInfo.authors.join(', ')
          : undefined,
        year: publishedYear,
        coverUrl: this.ensureHttps(coverUrl),
        coverThumbnailUrl: this.ensureHttps(imageLinks?.thumbnail),
        source: 'GoogleBooks',
        metadata: {
          volumeId,
          publishedDate: volumeInfo.publishedDate,
          description: volumeInfo.description,
          pageCount: volumeInfo.pageCount,
          language: volumeInfo.language,
          publisher: volumeInfo.publisher,
        },
      };
    } catch (error) {
      console.error(`Error fetching GoogleBooks volume:`, error);
      return null;
    }
  }

  private ensureHttps(url?: string | null): string | undefined {
    if (!url) return undefined;
    return url.replace(/^http:/, 'https:');
  }
}
