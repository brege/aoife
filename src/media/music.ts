import axios from 'axios';
import { type MediaSearchResult, MediaService } from './service';
import type { MediaSearchValues } from './types';

interface CoverArtSource {
  name: string;
  priority: number;
  getCoverUrl(release: MusicBrainzRelease): Promise<string | null>;
  getThumbnailUrl(release: MusicBrainzRelease): Promise<string | null>;
}

interface MusicBrainzRelease {
  id: string;
  title: string;
  date?: string;
  country?: string;
  'artist-credit'?: Array<{
    name: string;
    artist: { id: string; name: string };
  }>;
  'release-group'?: {
    id: string;
    'primary-type'?: string;
  };
  'label-info'?: Array<{
    'catalog-number'?: string;
    label?: { name: string };
  }>;
}

interface MusicBrainzSearchResponse {
  created: string;
  count: number;
  offset: number;
  releases: MusicBrainzRelease[];
}

const USER_AGENT = 'aoife/0.1.0 (https://github.com/user/aoife)';

class CoverArtArchiveSource implements CoverArtSource {
  name = 'CoverArtArchive';
  priority = 1;

  async getCoverUrl(release: MusicBrainzRelease): Promise<string | null> {
    return `https://coverartarchive.org/release/${release.id}/front-500`;
  }

  async getThumbnailUrl(release: MusicBrainzRelease): Promise<string | null> {
    return `https://coverartarchive.org/release/${release.id}/front-250`;
  }

  async checkAvailability(releaseId: string): Promise<boolean> {
    try {
      const response = await axios.head(
        `https://coverartarchive.org/release/${releaseId}/front`,
        { timeout: 3000, maxRedirects: 0, validateStatus: (s) => s < 400 },
      );
      return response.status === 200 || response.status === 307;
    } catch {
      return false;
    }
  }
}

class iTunesSource implements CoverArtSource {
  name = 'iTunes';
  priority = 2;

  async getCoverUrl(release: MusicBrainzRelease): Promise<string | null> {
    const artist = release['artist-credit']?.[0]?.name;
    const album = release.title;
    if (!artist || !album) return null;

    try {
      const response = await axios.get<{
        resultCount: number;
        results: Array<{
          artworkUrl100?: string;
          collectionName?: string;
        }>;
      }>('https://itunes.apple.com/search', {
        params: {
          term: `${artist} ${album}`,
          media: 'music',
          entity: 'album',
          limit: 1,
        },
        timeout: 3000,
      });

      const result = response.data.results[0];
      if (result?.artworkUrl100) {
        return result.artworkUrl100.replace('100x100', '600x600');
      }
      return null;
    } catch {
      return null;
    }
  }

  async getThumbnailUrl(release: MusicBrainzRelease): Promise<string | null> {
    const coverUrl = await this.getCoverUrl(release);
    if (coverUrl) {
      return coverUrl.replace('600x600', '200x200');
    }
    return null;
  }
}

class DeezerSource implements CoverArtSource {
  name = 'Deezer';
  priority = 3;

  async getCoverUrl(release: MusicBrainzRelease): Promise<string | null> {
    const artist = release['artist-credit']?.[0]?.name;
    const album = release.title;
    if (!artist || !album) return null;

    try {
      const response = await axios.get<{
        data: Array<{
          cover_big?: string;
          cover_xl?: string;
        }>;
      }>('https://api.deezer.com/search/album', {
        params: { q: `artist:"${artist}" album:"${album}"`, limit: 1 },
        timeout: 3000,
      });

      const result = response.data.data[0];
      return result?.cover_xl || result?.cover_big || null;
    } catch {
      return null;
    }
  }

  async getThumbnailUrl(release: MusicBrainzRelease): Promise<string | null> {
    const artist = release['artist-credit']?.[0]?.name;
    const album = release.title;
    if (!artist || !album) return null;

    try {
      const response = await axios.get<{
        data: Array<{ cover_medium?: string }>;
      }>('https://api.deezer.com/search/album', {
        params: { q: `artist:"${artist}" album:"${album}"`, limit: 1 },
        timeout: 3000,
      });

      return response.data.data[0]?.cover_medium || null;
    } catch {
      return null;
    }
  }
}

const defaultSources: CoverArtSource[] = [
  new CoverArtArchiveSource(),
  new iTunesSource(),
  new DeezerSource(),
].sort((a, b) => a.priority - b.priority);

export class MusicService extends MediaService {
  private readonly sources: CoverArtSource[];
  private searchCache: {
    params: string;
    results: MediaSearchResult[];
    releases: MusicBrainzRelease[];
    timestamp: number;
  } | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000;
  private itemToSearchParams = new Map<string | number, string>();

  constructor(sources: CoverArtSource[] = defaultSources) {
    super();
    this.sources = sources;
  }

  async search(values: MediaSearchValues): Promise<MediaSearchResult[]> {
    const query = values.query || '';
    const artist = values.artist || '';
    const album = values.album || values.title || '';

    if (!query && !artist && !album) {
      return [];
    }

    const cacheKey = `${query}|${artist}|${album}`;

    if (
      this.searchCache &&
      this.searchCache.params === cacheKey &&
      Date.now() - this.searchCache.timestamp < this.CACHE_TTL
    ) {
      return this.searchCache.results.slice(0, 10);
    }

    try {
      const releases = await this.searchMusicBrainz(query, artist, album);
      const results = await this.mapReleasesToResults(releases);

      this.searchCache = {
        params: cacheKey,
        results,
        releases,
        timestamp: Date.now(),
      };

      results.forEach((item) => {
        this.itemToSearchParams.set(item.id, cacheKey);
      });

      return results.slice(0, 10);
    } catch (error) {
      console.error('Music search error:', error);
      throw new Error('Failed to search music');
    }
  }

  async getDetails(id: string | number): Promise<MediaSearchResult | null> {
    if (typeof id !== 'string' || !id.startsWith('mb:')) {
      return null;
    }

    const mbid = id.replace('mb:', '');

    try {
      const response = await axios.get<MusicBrainzRelease>(
        `https://musicbrainz.org/ws/2/release/${mbid}`,
        {
          params: { fmt: 'json', inc: 'artist-credits+labels+release-groups' },
          headers: { 'User-Agent': USER_AGENT },
          timeout: 5000,
        },
      );

      const results = await this.mapReleasesToResults([response.data]);
      return results[0] || null;
    } catch (error) {
      console.error(`Error fetching release ${mbid}:`, error);
      return null;
    }
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

  private async searchMusicBrainz(
    query: string,
    artist: string,
    album: string,
  ): Promise<MusicBrainzRelease[]> {
    let searchQuery = '';

    if (query) {
      searchQuery = query;
    } else {
      const parts: string[] = [];
      if (artist) parts.push(`artist:"${artist}"`);
      if (album) parts.push(`release:"${album}"`);
      searchQuery = parts.join(' AND ');
    }

    const response = await axios.get<MusicBrainzSearchResponse>(
      'https://musicbrainz.org/ws/2/release',
      {
        params: {
          query: searchQuery,
          fmt: 'json',
          limit: 20,
        },
        headers: { 'User-Agent': USER_AGENT },
        timeout: 5000,
      },
    );

    return response.data.releases || [];
  }

  private async mapReleasesToResults(
    releases: MusicBrainzRelease[],
  ): Promise<MediaSearchResult[]> {
    const results = await Promise.all(
      releases.map(async (release) => {
        const artistName = release['artist-credit']?.[0]?.name || 'Unknown';
        const year = release.date
          ? parseInt(release.date.substring(0, 4), 10)
          : undefined;

        let coverUrl: string | null = null;
        let thumbnailUrl: string | null = null;
        let coverSource: string | null = null;

        for (const source of this.sources) {
          try {
            const url = await source.getCoverUrl(release);
            if (url) {
              if (source instanceof CoverArtArchiveSource) {
                const available = await source.checkAvailability(release.id);
                if (!available) continue;
              }
              coverUrl = url;
              thumbnailUrl = await source.getThumbnailUrl(release);
              coverSource = source.name;
              break;
            }
          } catch {}
        }

        return {
          id: `mb:${release.id}`,
          type: 'music',
          title: release.title,
          subtitle: artistName,
          year: Number.isNaN(year) ? undefined : year,
          coverUrl,
          coverThumbnailUrl: thumbnailUrl,
          source: coverSource || 'MusicBrainz',
          metadata: {
            mbid: release.id,
            artist: artistName,
            country: release.country,
            releaseGroup: release['release-group']?.id,
            releaseType: release['release-group']?.['primary-type'],
            label: release['label-info']?.[0]?.label?.name,
            catalogNumber: release['label-info']?.[0]?.['catalog-number'],
            coverSource,
          },
        };
      }),
    );

    return results.sort((a, b) => {
      if (a.coverUrl && !b.coverUrl) return -1;
      if (!a.coverUrl && b.coverUrl) return 1;
      return 0;
    });
  }
}
