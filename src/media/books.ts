import axios from 'axios';
import { type MediaSearchResult, MediaService } from './service';
import type { MediaSearchValues } from './types';

interface OpenLibraryResult {
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  edition_count?: number;
  isbn?: string[];
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

type SearchMode = 'strict' | 'broad';

export class BooksService extends MediaService {
  private searchCache: SearchCache | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private itemToSearchParams = new Map<string | number, string>();

  private buildGoogleBooksCoverUrl(
    volumeId: string,
    zoom: number,
  ): string {
    const url = new URL('https://books.google.com/books/content');
    url.searchParams.set('id', volumeId);
    url.searchParams.set('printsec', 'frontcover');
    url.searchParams.set('img', '1');
    url.searchParams.set('zoom', String(zoom));
    return url.toString();
  }

  private buildOpenLibraryCoverUrl(
    coverId: number,
    size: 'L' | 'S',
  ): string {
    return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
  }

  private buildOpenLibraryInternationalStandardBookNumberCoverUrl(
    internationalStandardBookNumber: string,
    size: 'L' | 'S',
  ): string {
    return `https://covers.openlibrary.org/b/isbn/${internationalStandardBookNumber}-${size}.jpg?default=false`;
  }

  async search(values: MediaSearchValues): Promise<MediaSearchResult[]> {
    const title = values.title || values.query || '';
    const author = values.author || '';
    const combinedQuery = [title, author].filter(Boolean).join(' ').trim();

    if (!combinedQuery) {
      return [];
    }

    const strictCacheKey = `strict:${title}|${author}`;
    if (
      this.searchCache &&
      this.searchCache.params === strictCacheKey &&
      Date.now() - this.searchCache.timestamp < this.CACHE_TTL
    ) {
      return this.searchCache.results.slice(0, 10);
    }

    const strictResults =
      title || author
        ? await this.searchBooks({
            mode: 'strict',
            variants: this.buildStrictVariants(title, author),
          })
        : [];

    let searchMode: SearchMode = 'strict';
    let results = strictResults;

    const minimumStrictResults = 6;
    if (results.length < minimumStrictResults && combinedQuery) {
      searchMode = 'broad';
      const broadCacheKey = `broad:${combinedQuery}`;
      if (
        this.searchCache &&
        this.searchCache.params === broadCacheKey &&
        Date.now() - this.searchCache.timestamp < this.CACHE_TTL
      ) {
        return this.searchCache.results.slice(0, 10);
      }
      const broadResults = await this.searchBooks({
        mode: 'broad',
        variants: this.buildBroadVariants(title, author, combinedQuery),
      });
      results = [...results, ...broadResults];
    }

    const searchTokens = this.getSearchTokens(combinedQuery);
    const scoredResults = this.scoreResults(results, searchTokens, searchMode);

    const cacheKey = searchMode === 'strict' ? strictCacheKey : `broad:${combinedQuery}`;
    this.searchCache = {
      params: cacheKey,
      results: scoredResults,
      timestamp: Date.now(),
    };

    scoredResults.forEach((item) => {
      this.itemToSearchParams.set(item.id, cacheKey);
    });

    return scoredResults.slice(0, 10);
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
        .map((item) => item.coverUrl || item.coverThumbnailUrl)
        .filter((url): url is string => Boolean(url));
    }

    return [];
  }

  private async searchOpenLibraryStrict(
    title: string,
    author: string,
    limit: number,
    offset: number,
  ): Promise<MediaSearchResult[]> {
    if (!title && !author) {
      return [];
    }
    const searchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=${limit}&offset=${offset}`;
    const response = await axios.get<OpenLibrarySearchResponse>(searchUrl, {
      timeout: 2000,
    });

    return this.mapOpenLibraryResults(response.data.docs || []);
  }

  private async searchOpenLibraryBroad(
    query: string,
    limit: number,
    offset: number,
  ): Promise<MediaSearchResult[]> {
    if (!query) {
      return [];
    }
    const searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`;
    const response = await axios.get<OpenLibrarySearchResponse>(searchUrl, {
      timeout: 2000,
    });

    return this.mapOpenLibraryResults(response.data.docs || []);
  }

  private async searchGoogleBooksStrict(
    title: string,
    author: string,
    limit: number,
    offset: number,
  ): Promise<MediaSearchResult[]> {
    const queryParts: string[] = [];
    if (title) {
      queryParts.push(`intitle:"${title}"`);
    }
    if (author) {
      queryParts.push(`inauthor:"${author}"`);
    }
    if (queryParts.length === 0) {
      return [];
    }
    const query = queryParts.join(' ');
    const searchUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${limit}&startIndex=${offset}`;
    const response = await axios.get<GoogleBooksSearchResponse>(searchUrl, {
      timeout: 2000,
    });

    return this.mapGoogleBooksResults(response.data.items || []);
  }

  private async searchGoogleBooksBroad(
    query: string,
    limit: number,
    offset: number,
  ): Promise<MediaSearchResult[]> {
    if (!query) {
      return [];
    }
    const searchUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${limit}&startIndex=${offset}`;
    const response = await axios.get<GoogleBooksSearchResponse>(searchUrl, {
      timeout: 2000,
    });

    return this.mapGoogleBooksResults(response.data.items || []);
  }

  private async searchBooks({
    mode,
    variants,
  }: {
    mode: SearchMode;
    variants: Array<{ title?: string; author?: string; query?: string }>;
  }): Promise<MediaSearchResult[]> {
    if (variants.length === 0) {
      return [];
    }
    const limit = 10;
    const offset = 10;
    const requests: Array<Promise<MediaSearchResult[]>> = [];
    for (const variant of variants) {
      if (mode === 'strict') {
        const title = variant.title || '';
        const author = variant.author || '';
        requests.push(
          this.searchOpenLibraryStrict(title, author, limit, 0),
          this.searchOpenLibraryStrict(title, author, limit, offset),
          this.searchGoogleBooksStrict(title, author, limit, 0),
          this.searchGoogleBooksStrict(title, author, limit, offset),
        );
      } else {
        const query = variant.query || '';
        requests.push(
          this.searchOpenLibraryBroad(query, limit, 0),
          this.searchOpenLibraryBroad(query, limit, offset),
          this.searchGoogleBooksBroad(query, limit, 0),
          this.searchGoogleBooksBroad(query, limit, offset),
        );
      }
    }

    const results = await Promise.allSettled(requests);
    const failedRequests = results.filter(
      (result) => result.status === 'rejected',
    );
    if (failedRequests.length === results.length) {
      throw new Error('Failed to search books');
    }

    const combinedResults = results.flatMap((result) =>
      result.status === 'fulfilled' ? result.value : [],
    );

    return combinedResults;
  }

  private buildStrictVariants(
    title: string,
    author: string,
  ): Array<{ title: string; author: string }> {
    const variants: Array<{ title: string; author: string }> = [];
    if (title && author) {
      variants.push({ title, author });
    }
    if (title) {
      variants.push({ title, author: '' });
    }
    if (author) {
      variants.push({ title: '', author });
    }
    const seen = new Set<string>();
    return variants.filter((variant) => {
      const key = `${variant.title}|${variant.author}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private buildBroadVariants(
    title: string,
    author: string,
    combinedQuery: string,
  ): Array<{ query: string }> {
    const variants: Array<{ query: string }> = [];
    if (combinedQuery) {
      variants.push({ query: combinedQuery });
    }
    if (title) {
      variants.push({ query: title });
    }
    if (author) {
      variants.push({ query: author });
    }
    const seen = new Set<string>();
    return variants.filter((variant) => {
      const key = variant.query;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private mapOpenLibraryResults(
    documents: OpenLibraryResult[],
  ): MediaSearchResult[] {
    return documents
      .map((doc) => {
        const coverId = doc.cover_i;
        const internationalStandardBookNumbers =
          this.getInternationalStandardBookNumbersFromOpenLibrary(doc);
        const selectedInternationalStandardBookNumber =
          this.selectInternationalStandardBookNumber(
            internationalStandardBookNumbers,
          );
        const openLibraryKey = doc.key ? doc.key.replace('/works/', '') : null;
        const coverUrl = coverId
          ? this.buildOpenLibraryCoverUrl(coverId, 'L')
          : selectedInternationalStandardBookNumber
            ? this.buildOpenLibraryInternationalStandardBookNumberCoverUrl(
                selectedInternationalStandardBookNumber,
                'L',
              )
            : null;
        const coverThumbnailUrl = coverId
          ? this.buildOpenLibraryCoverUrl(coverId, 'S')
          : selectedInternationalStandardBookNumber
            ? this.buildOpenLibraryInternationalStandardBookNumberCoverUrl(
                selectedInternationalStandardBookNumber,
                'S',
              )
            : null;

        return {
          id: openLibraryKey
            ? `ol:${openLibraryKey}`
            : coverId
              ? `ol:${coverId}`
              : `ol:${doc.title}`,
          type: 'books',
          title: doc.title,
          subtitle: doc.author_name ? doc.author_name.join(', ') : undefined,
          year: doc.first_publish_year,
          coverUrl,
          coverThumbnailUrl,
          source: 'OpenLibrary',
          metadata: {
            coverId: coverId || null,
            openLibraryKey,
            editionCount: doc.edition_count,
            internationalStandardBookNumbers,
          },
        };
      })
      .filter((item) => item.title);
  }

  private mapGoogleBooksResults(
    items: GoogleBooksVolume[],
  ): MediaSearchResult[] {
    return items
      .map((item) => {
        const volumeInfo = item.volumeInfo;
        const publishedYear = volumeInfo.publishedDate
          ? parseInt(volumeInfo.publishedDate.substring(0, 4), 10)
          : undefined;

        const coverUrl = this.buildGoogleBooksCoverUrl(item.id, 2);
        const coverThumbnailUrl = this.buildGoogleBooksCoverUrl(item.id, 1);
        const internationalStandardBookNumbers =
          this.getInternationalStandardBookNumbersFromGoogleBooks(volumeInfo);

        return {
          id: `gb:${item.id}`,
          type: 'books',
          title: volumeInfo.title || 'Unknown',
          subtitle: volumeInfo.authors
            ? volumeInfo.authors.join(', ')
            : undefined,
          year: publishedYear,
          coverUrl: this.ensureHttps(coverUrl),
          coverThumbnailUrl: this.ensureHttps(coverThumbnailUrl),
          source: 'GoogleBooks',
          metadata: {
            volumeId: item.id,
            publishedDate: volumeInfo.publishedDate,
            description: volumeInfo.description,
            pageCount: volumeInfo.pageCount,
            language: volumeInfo.language,
            internationalStandardBookNumbers,
          },
        };
      })
      .filter((item) => item.title);
  }

  private getInternationalStandardBookNumbersFromOpenLibrary(
    result: OpenLibraryResult,
  ): string[] {
    if (!result.isbn) {
      return [];
    }
    return result.isbn
      .map((identifier) => this.normalizeInternationalStandardBookNumber(identifier))
      .filter((identifier) => identifier.length > 0);
  }

  private getInternationalStandardBookNumbersFromGoogleBooks(
    volumeInfo: GoogleBooksVolumeInfo,
  ): string[] {
    if (!volumeInfo.industryIdentifiers) {
      return [];
    }
    return volumeInfo.industryIdentifiers
      .map((identifier) =>
        this.normalizeInternationalStandardBookNumber(identifier.identifier),
      )
      .filter((identifier) => identifier.length > 0);
  }

  private normalizeInternationalStandardBookNumber(
    value: string,
  ): string {
    return value.replace(/[^0-9Xx]/g, '').toUpperCase();
  }

  private selectInternationalStandardBookNumber(
    identifiers: string[],
  ): string | null {
    const preferred = identifiers.find((identifier) => identifier.length === 13);
    if (preferred) {
      return preferred;
    }
    const fallback = identifiers.find((identifier) => identifier.length === 10);
    return fallback || null;
  }

  private normalizeToken(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private getSearchTokens(value: string): string[] {
    const normalized = this.normalizeToken(value);
    if (!normalized) {
      return [];
    }
    const uniqueTokens = new Set(normalized.split(/\s+/g));
    return Array.from(uniqueTokens);
  }

  private scoreResults(
    results: MediaSearchResult[],
    searchTokens: string[],
    mode: SearchMode,
  ): MediaSearchResult[] {
    const scoredById = new Map<string | number, MediaSearchResult>();
    const currentYear = new Date().getFullYear();

    for (const item of results) {
      const itemTokens = this.getSearchTokens(
        `${item.title} ${item.subtitle || ''}`.trim(),
      );
      const matchedTokens = searchTokens.filter((token) =>
        itemTokens.includes(token),
      );
      const matchScore =
        searchTokens.length === 0
          ? 0
          : matchedTokens.length / searchTokens.length;

      const hasCover = Boolean(item.coverUrl);
      const source = item.source || 'Unknown';
      const coverScore = hasCover
        ? source === 'GoogleBooks'
          ? 1
          : 0.35
        : 0;

      const year = item.year ?? null;
      let recencyScore = 0;
      if (year !== null && Number.isFinite(year)) {
        const age = Math.max(0, currentYear - year);
        recencyScore = Math.max(0, Math.min(1, 1 - age / 50));
      }

      const rankScore =
        coverScore * 0.5 + matchScore * 0.3 + recencyScore * 0.2;

      const enriched: MediaSearchResult = {
        ...item,
        metadata: {
          ...item.metadata,
          matchScore,
          coverScore,
          recencyScore,
          rankScore,
          searchMode: mode,
        },
      };

      const existing = scoredById.get(item.id);
      if (!existing) {
        scoredById.set(item.id, enriched);
        continue;
      }

      const existingScore = Number(
        (existing.metadata as Record<string, unknown>)?.rankScore ?? 0,
      );
      if (rankScore > existingScore) {
        scoredById.set(item.id, enriched);
      }
    }

    return Array.from(scoredById.values()).sort((a, b) => {
      const rankA = Number(
        (a.metadata as Record<string, unknown>)?.rankScore ?? 0,
      );
      const rankB = Number(
        (b.metadata as Record<string, unknown>)?.rankScore ?? 0,
      );
      if (rankA !== rankB) {
        return rankB - rankA;
      }
      if (a.coverUrl && !b.coverUrl) return -1;
      if (!a.coverUrl && b.coverUrl) return 1;
      const yearA = a.year ?? 0;
      const yearB = b.year ?? 0;
      if (yearA !== yearB) {
        return yearB - yearA;
      }
      return a.title.localeCompare(b.title);
    });
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
        timeout: 2000,
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
        timeout: 2000,
      });

      const volumeInfo = response.data.volumeInfo;
      const publishedYear = volumeInfo.publishedDate
        ? parseInt(volumeInfo.publishedDate.substring(0, 4), 10)
        : undefined;

      const coverUrl = this.buildGoogleBooksCoverUrl(volumeId, 2);
      const coverThumbnailUrl = this.buildGoogleBooksCoverUrl(volumeId, 1);

      return {
        id: `gb:${volumeId}`,
        type: 'books',
        title: volumeInfo.title || 'Unknown',
        subtitle: volumeInfo.authors
          ? volumeInfo.authors.join(', ')
          : undefined,
        year: publishedYear,
        coverUrl: this.ensureHttps(coverUrl),
        coverThumbnailUrl: this.ensureHttps(coverThumbnailUrl),
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
