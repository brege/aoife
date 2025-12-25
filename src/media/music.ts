import axios from 'axios';
import packageJson from '../../package.json';
import logger from '../lib/logger';
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
  'cover-art-archive'?: {
    front?: boolean;
    artwork?: boolean;
    count?: number;
  };
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

interface CoverArtArchiveMetadataResponse {
  images?: Array<{
    front?: boolean;
    image?: string;
    thumbnails?: {
      small?: string;
      large?: string;
    };
  }>;
}

const appVersion = packageJson.version ?? 'unknown';
const USER_AGENT = `aoife/${appVersion} (https://github.com/brege/aoife)`;

const normalizeSearchToken = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const buildCoverArtArchiveProxyUrl = (
  type: 'release',
  id: string,
  size: 250 | 500,
): string => {
  const params = new URLSearchParams({
    type,
    id,
    size: String(size),
  });
  return `/api/coverart/image?${params.toString()}`;
};

const normalizeCoverArtUrl = (value: string): string => {
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol === 'http:' &&
      parsed.hostname.endsWith('coverartarchive.org')
    ) {
      parsed.protocol = 'https:';
      return parsed.toString();
    }
  } catch {
    return value;
  }
  return value;
};

class CoverArtArchiveSource implements CoverArtSource {
  name = 'CoverArtArchive';
  priority = 1;
  private metadataCache = new Map<
    string,
    CoverArtArchiveMetadataResponse | null
  >();
  private metadataInFlight = new Map<
    string,
    Promise<CoverArtArchiveMetadataResponse | null>
  >();

  private async fetchMetadata(
    releaseId: string,
  ): Promise<CoverArtArchiveMetadataResponse | null> {
    const cached = this.metadataCache.get(releaseId);
    if (cached !== undefined) {
      return cached;
    }
    const inFlight = this.metadataInFlight.get(releaseId);
    if (inFlight) {
      return inFlight;
    }
    const params = new URLSearchParams({
      type: 'release',
      id: releaseId,
    });
    const request = axios
      .get<CoverArtArchiveMetadataResponse>(
        `/api/coverart/metadata?${params.toString()}`,
        {
          timeout: 5000,
          validateStatus: (status) => status >= 200 && status < 600,
        },
      )
      .then((response) => {
        if (response.status !== 200) {
          return null;
        }
        return response.data;
      })
      .catch(() => null)
      .finally(() => {
        this.metadataInFlight.delete(releaseId);
      });
    this.metadataInFlight.set(releaseId, request);
    const result = await request;
    this.metadataCache.set(releaseId, result);
    return result;
  }

  private shouldRequestMetadata(release: MusicBrainzRelease): boolean {
    const coverArtArchive = release['cover-art-archive'];
    if (!coverArtArchive) {
      return true;
    }
    if (coverArtArchive.front || coverArtArchive.artwork) {
      return true;
    }
    return (coverArtArchive.count ?? 0) > 0;
  }

  async getCoverUrl(release: MusicBrainzRelease): Promise<string | null> {
    if (!this.shouldRequestMetadata(release)) {
      return null;
    }
    const metadata = await this.fetchMetadata(release.id);
    const image =
      metadata?.images?.find((item) => item.front) ?? metadata?.images?.[0];
    if (image?.image) {
      return normalizeCoverArtUrl(image.image);
    }
    return buildCoverArtArchiveProxyUrl('release', release.id, 500);
  }

  async getThumbnailUrl(release: MusicBrainzRelease): Promise<string | null> {
    if (!this.shouldRequestMetadata(release)) {
      return null;
    }
    const metadata = await this.fetchMetadata(release.id);
    const image =
      metadata?.images?.find((item) => item.front) ?? metadata?.images?.[0];
    if (image?.thumbnails?.large) {
      return normalizeCoverArtUrl(image.thumbnails.large);
    }
    if (image?.thumbnails?.small) {
      return normalizeCoverArtUrl(image.thumbnails.small);
    }
    return buildCoverArtArchiveProxyUrl('release', release.id, 500);
  }
}

class iTunesSource implements CoverArtSource {
  name = 'iTunes';
  priority = 2;

  private pickArtworkUrl(
    release: MusicBrainzRelease,
    results: Array<{
      artistName?: string;
      artworkUrl100?: string;
      collectionName?: string;
    }>,
  ): string | null {
    const expectedArtist = release['artist-credit']?.[0]?.name;
    const expectedAlbum = release.title;
    if (!expectedArtist || !expectedAlbum) {
      return null;
    }

    const expectedArtistToken = normalizeSearchToken(expectedArtist);
    const expectedAlbumToken = normalizeSearchToken(expectedAlbum);

    const matching = results.find((result) => {
      const resultArtist = normalizeSearchToken(result.artistName || '');
      const resultAlbum = normalizeSearchToken(result.collectionName || '');
      if (resultArtist !== expectedArtistToken) {
        return false;
      }
      return (
        resultAlbum === expectedAlbumToken ||
        resultAlbum.includes(expectedAlbumToken)
      );
    });

    const artwork = matching?.artworkUrl100;
    if (!artwork) {
      return null;
    }
    return artwork.replace('100x100', '600x600');
  }

  async getCoverUrl(release: MusicBrainzRelease): Promise<string | null> {
    const artist = release['artist-credit']?.[0]?.name;
    const album = release.title;
    if (!artist || !album) return null;

    try {
      const response = await axios.get<{
        resultCount: number;
        results: Array<{
          artistName?: string;
          artworkUrl100?: string;
          collectionName?: string;
        }>;
      }>('https://itunes.apple.com/search', {
        params: {
          term: `${artist} ${album}`,
          media: 'music',
          entity: 'album',
          limit: 5,
        },
        timeout: 3000,
      });

      return this.pickArtworkUrl(release, response.data.results);
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

const defaultSources: CoverArtSource[] = [
  new CoverArtArchiveSource(),
  new iTunesSource(),
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
    const releaseGroupId = values.releaseGroupId?.trim();
    const coverUrlValue = values.coverUrl?.trim();

    if (coverUrlValue) {
      const url = new URL(coverUrlValue);
      if (url.protocol !== 'https:') {
        throw new Error('Cover URL must use https');
      }
      const title = album.trim() || query.trim();
      if (!title) {
        throw new Error('Album is required for a direct cover URL');
      }
      return [
        {
          id: `direct:${coverUrlValue}`,
          type: 'music',
          title,
          subtitle: artist.trim() || undefined,
          coverUrl: coverUrlValue,
          coverThumbnailUrl: coverUrlValue,
          source: 'Direct',
          metadata: {
            coverUrl: coverUrlValue,
            isDirect: true,
          },
        },
      ];
    }

    if (!query && !artist && !album) {
      return [];
    }

    const cacheKey = `${query}|${artist}|${album}|${releaseGroupId ?? ''}`;

    if (
      this.searchCache &&
      this.searchCache.params === cacheKey &&
      Date.now() - this.searchCache.timestamp < this.CACHE_TTL
    ) {
      return this.searchCache.results;
    }

    try {
      const releases = releaseGroupId
        ? await this.searchMusicBrainzReleaseGroup(releaseGroupId)
        : await this.searchMusicBrainz(query, artist, album);
      const resolvedReleases =
        releases.length === 0 && !query && !releaseGroupId
          ? []
          : releases.length === 0 && releaseGroupId
            ? await this.searchMusicBrainz(query, artist, album)
            : releases;
      const results = await this.mapReleasesToResults(resolvedReleases);

      this.searchCache = {
        params: cacheKey,
        results,
        releases,
        timestamp: Date.now(),
      };

      results.forEach((item) => {
        this.itemToSearchParams.set(item.id, cacheKey);
      });

      return results;
    } catch (error) {
      const errorToLog =
        error instanceof Error ? error : new Error(String(error));
      logger.error(
        {
          error: errorToLog,
        },
        'Music search failed',
      );
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
      const errorToLog =
        error instanceof Error ? error : new Error(String(error));
      logger.error(
        {
          error: errorToLog,
          releaseId: mbid,
        },
        'MusicBrainz release fetch failed',
      );
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
          limit: 50,
          inc: 'artist-credits+release-groups+cover-art-archive',
        },
        headers: { 'User-Agent': USER_AGENT },
        timeout: 5000,
      },
    );

    return response.data.releases || [];
  }

  private async searchMusicBrainzReleaseGroup(
    releaseGroupId: string,
  ): Promise<MusicBrainzRelease[]> {
    const response = await axios.get<MusicBrainzSearchResponse>(
      'https://musicbrainz.org/ws/2/release',
      {
        params: {
          query: `rgid:${releaseGroupId}`,
          fmt: 'json',
          limit: 50,
          inc: 'artist-credits+release-groups+cover-art-archive',
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
          const url = await source.getCoverUrl(release);
          if (!url) {
            continue;
          }

          coverUrl = url;
          thumbnailUrl = await source.getThumbnailUrl(release);
          coverSource = source.name;
          break;
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

    const withCovers = results.filter((result) => Boolean(result?.coverUrl));

    return withCovers.sort((a, b) => {
      if (a.coverUrl && !b.coverUrl) return -1;
      if (!a.coverUrl && b.coverUrl) return 1;
      return 0;
    });
  }
}
