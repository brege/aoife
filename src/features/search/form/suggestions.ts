type SuggestionEntry = {
  id: string | number;
  label: string;
  value: string;
  authorKeys?: string[];
};

type ReleaseGroupEntry = {
  id: string;
  title: string;
  year?: number;
};

type SuggestionResponseParser = (
  response: Response,
) => Promise<SuggestionEntry[]>;

const SUGGESTION_CACHE_TTL_MS = 60 * 1000;
const RELEASE_GROUP_CACHE_TTL_MS = 5 * 60 * 1000;
const RELEASE_GROUP_PAGE_SIZE = 100;
const MAX_RELEASE_GROUPS = 300;
const suggestionCache = new Map<
  string,
  { timestamp: number; results: SuggestionEntry[] }
>();
const inFlightSuggestions = new Map<string, Promise<SuggestionEntry[]>>();
const releaseGroupCache = new Map<
  string,
  { timestamp: number; results: ReleaseGroupEntry[] }
>();
const releaseGroupInFlight = new Map<string, Promise<ReleaseGroupEntry[]>>();

const fetchSuggestions = async (
  key: string,
  endpoint: string,
  parser: SuggestionResponseParser,
): Promise<SuggestionEntry[]> => {
  const cached = suggestionCache.get(key);
  if (cached && Date.now() - cached.timestamp < SUGGESTION_CACHE_TTL_MS) {
    return cached.results;
  }

  const existing = inFlightSuggestions.get(key);
  if (existing) {
    return existing;
  }

  const request = fetch(endpoint)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Suggestion request failed');
      }
      return parser(response);
    })
    .then((mapped) => {
      suggestionCache.set(key, {
        timestamp: Date.now(),
        results: mapped,
      });
      return mapped;
    })
    .finally(() => {
      inFlightSuggestions.delete(key);
    });

  inFlightSuggestions.set(key, request);
  return request;
};

const parseGameSuggestions = async (
  response: Response,
): Promise<SuggestionEntry[]> => {
  const data = (await response.json()) as {
    data?: {
      games?: Array<{
        id: number;
        game_title: string;
        release_date?: string;
      }>;
    };
  };
  if (!data || typeof data !== 'object' || !data.data) {
    throw new Error('Invalid games suggestion response');
  }
  if (!Array.isArray(data.data.games)) {
    throw new Error('Invalid games suggestion response');
  }

  return data.data.games
    .map((result) => {
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid games suggestion result');
      }
      const title = result.game_title?.trim();
      if (!title) {
        throw new Error('Invalid games suggestion title');
      }
      const year = result.release_date
        ? new Date(result.release_date).getFullYear()
        : undefined;
      const label = year ? `${title} (${year})` : title;
      return {
        id: result.id,
        label,
        value: title,
      };
    })
    .slice(0, 8);
};

const parseTmdbSuggestions =
  (mediaType: 'movies' | 'tv') =>
  async (response: Response): Promise<SuggestionEntry[]> => {
    const data = (await response.json()) as {
      results?: Array<{
        id: number;
        title?: string;
        name?: string;
        release_date?: string;
        first_air_date?: string;
      }>;
    };
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid TMDB suggestion response');
    }
    if (!Array.isArray(data.results)) {
      throw new Error('Invalid TMDB suggestion response');
    }

    return data.results
      .map((result) => {
        if (!result || typeof result !== 'object') {
          throw new Error('Invalid TMDB suggestion result');
        }
        const title = mediaType === 'tv' ? result.name : result.title;
        if (!title) {
          throw new Error('Invalid TMDB suggestion title');
        }
        const dateValue =
          mediaType === 'tv' ? result.first_air_date : result.release_date;
        const year = dateValue ? new Date(dateValue).getFullYear() : undefined;
        const label = year ? `${title} (${year})` : title;
        return {
          id: result.id,
          label,
          value: title,
        };
      })
      .slice(0, 8);
  };

const parseMusicBrainzArtistSuggestions = async (
  response: Response,
): Promise<SuggestionEntry[]> => {
  const data = (await response.json()) as {
    artists?: Array<{
      id: string;
      name: string;
      disambiguation?: string;
    }>;
  };
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid MusicBrainz artist response');
  }
  if (!Array.isArray(data.artists)) {
    throw new Error('Invalid MusicBrainz artist response');
  }

  return data.artists
    .map((artist) => {
      if (!artist || typeof artist !== 'object') {
        throw new Error('Invalid MusicBrainz artist result');
      }
      if (typeof artist.id !== 'string' || typeof artist.name !== 'string') {
        throw new Error('Invalid MusicBrainz artist result');
      }
      const disambiguation = artist.disambiguation?.trim();
      const label = disambiguation
        ? `${artist.name} (${disambiguation})`
        : artist.name;
      return {
        id: artist.id,
        label,
        value: artist.name,
      };
    })
    .slice(0, 8);
};

const parseMusicBrainzReleaseGroups = async (
  response: Response,
): Promise<{
  entries: ReleaseGroupEntry[];
  count: number;
}> => {
  const data = (await response.json()) as {
    'release-groups'?: Array<{
      id: string;
      title: string;
      'first-release-date'?: string;
    }>;
    'release-group-count'?: number;
  };
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid MusicBrainz release group response');
  }
  if (!Array.isArray(data['release-groups'])) {
    throw new Error('Invalid MusicBrainz release group response');
  }

  const entries = data['release-groups'].map((releaseGroup) => {
    if (!releaseGroup || typeof releaseGroup !== 'object') {
      throw new Error('Invalid MusicBrainz release group result');
    }
    if (
      typeof releaseGroup.id !== 'string' ||
      typeof releaseGroup.title !== 'string'
    ) {
      throw new Error('Invalid MusicBrainz release group result');
    }
    const yearValue = releaseGroup['first-release-date']?.slice(0, 4);
    const year = yearValue ? Number.parseInt(yearValue, 10) : undefined;
    return {
      id: releaseGroup.id,
      title: releaseGroup.title,
      year,
    };
  });

  const countValue =
    typeof data['release-group-count'] === 'number'
      ? data['release-group-count']
      : entries.length;

  return {
    entries,
    count: countValue,
  };
};

const fetchArtistReleaseGroups = async (
  artistId: string,
): Promise<ReleaseGroupEntry[]> => {
  const cached = releaseGroupCache.get(artistId);
  if (cached && Date.now() - cached.timestamp < RELEASE_GROUP_CACHE_TTL_MS) {
    return cached.results;
  }

  const existing = releaseGroupInFlight.get(artistId);
  if (existing) {
    return existing;
  }

  const request = (async () => {
    const allEntries: ReleaseGroupEntry[] = [];
    let offset = 0;
    let totalCount = Number.POSITIVE_INFINITY;

    while (offset < totalCount && allEntries.length < MAX_RELEASE_GROUPS) {
      const params = new URLSearchParams({
        artist: artistId,
        fmt: 'json',
        limit: String(RELEASE_GROUP_PAGE_SIZE),
        offset: String(offset),
      });
      const endpoint = `https://musicbrainz.org/ws/2/release-group?${params.toString()}`;
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Release group request failed');
      }
      const { entries, count } = await parseMusicBrainzReleaseGroups(response);
      allEntries.push(...entries);
      totalCount = count;
      offset += RELEASE_GROUP_PAGE_SIZE;
      if (entries.length === 0) {
        break;
      }
    }

    const unique = new Map<string, ReleaseGroupEntry>();
    allEntries.forEach((entry) => {
      if (!unique.has(entry.id)) {
        unique.set(entry.id, entry);
      }
    });
    const results = Array.from(unique.values());
    releaseGroupCache.set(artistId, {
      timestamp: Date.now(),
      results,
    });
    return results;
  })().finally(() => {
    releaseGroupInFlight.delete(artistId);
  });

  releaseGroupInFlight.set(artistId, request);
  return request;
};

const parseOpenLibraryBookSuggestions = async (
  response: Response,
): Promise<SuggestionEntry[]> => {
  const data = (await response.json()) as {
    docs?: Array<{
      key?: string;
      title?: string;
      author_name?: string[];
      first_publish_year?: number;
    }>;
  };
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid OpenLibrary response');
  }
  if (!Array.isArray(data.docs)) {
    throw new Error('Invalid OpenLibrary response');
  }

  return data.docs
    .map((document) => {
      if (!document || typeof document !== 'object') {
        throw new Error('Invalid OpenLibrary result');
      }
      if (typeof document.title !== 'string' || document.title.trim() === '') {
        throw new Error('Invalid OpenLibrary title');
      }
      const author = Array.isArray(document.author_name)
        ? document.author_name[0]
        : undefined;
      const year = document.first_publish_year;
      let label = document.title.trim();
      if (author) {
        label = `${label} - ${author}`;
      }
      if (typeof year === 'number') {
        label = `${label} (${year})`;
      }
      const keyValue =
        typeof document.key === 'string' && document.key.trim() !== ''
          ? document.key
          : `${document.title}-${author ?? 'unknown'}`;
      return {
        id: keyValue,
        label,
        value: document.title.trim(),
      };
    })
    .slice(0, 8);
};

const normalizeAuthorLabel = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (trimmed.includes(',')) {
    const [lastName, firstName] = trimmed.split(',').map((part) => part.trim());
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
  }
  return trimmed.replace(/[;:]+/g, ' ').replace(/\s+/g, ' ').trim();
};

const normalizeAuthorKey = (value: string): string =>
  normalizeAuthorLabel(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const parseOpenLibraryAuthorSuggestions = async (
  response: Response,
): Promise<SuggestionEntry[]> => {
  const data = (await response.json()) as {
    docs?: Array<{
      key?: string;
      name?: string;
    }>;
  };
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid OpenLibrary author response');
  }
  if (!Array.isArray(data.docs)) {
    throw new Error('Invalid OpenLibrary author response');
  }

  const grouped = new Map<
    string,
    {
      label: string;
      value: string;
      authorKeys: string[];
    }
  >();

  data.docs.forEach((document) => {
    if (!document || typeof document !== 'object') {
      throw new Error('Invalid OpenLibrary author result');
    }
    if (typeof document.name !== 'string' || document.name.trim() === '') {
      throw new Error('Invalid OpenLibrary author name');
    }
    const label = normalizeAuthorLabel(document.name);
    const normalizedKey = normalizeAuthorKey(document.name);
    if (!normalizedKey) {
      return;
    }
    const entry = grouped.get(normalizedKey);
    const authorKey =
      typeof document.key === 'string' && document.key.trim() !== ''
        ? document.key
        : null;
    if (!entry) {
      grouped.set(normalizedKey, {
        label,
        value: label,
        authorKeys: authorKey ? [authorKey] : [],
      });
      return;
    }
    if (authorKey && !entry.authorKeys.includes(authorKey)) {
      entry.authorKeys.push(authorKey);
    }
  });

  return Array.from(grouped.values())
    .map((entry) => ({
      id: entry.authorKeys.join('|') || entry.value,
      label: entry.label,
      value: entry.value,
      authorKeys: entry.authorKeys,
    }))
    .slice(0, 8);
};

const normalizeTitleKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const scoreTitleMatch = (query: string, title: string): number => {
  if (!query) {
    return 0;
  }
  if (title.startsWith(query)) {
    return 2;
  }
  if (title.includes(query)) {
    return 1;
  }
  return 0;
};

const parseOpenLibraryWorksSuggestions = async (
  response: Response,
  query: string,
): Promise<SuggestionEntry[]> => {
  const data = (await response.json()) as {
    entries?: Array<{
      key?: string;
      title?: string;
      first_publish_year?: number;
    }>;
  };
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid OpenLibrary works response');
  }
  if (!Array.isArray(data.entries)) {
    throw new Error('Invalid OpenLibrary works response');
  }

  const normalizedQuery = normalizeTitleKey(query);
  const mapped = data.entries
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        throw new Error('Invalid OpenLibrary works result');
      }
      if (typeof entry.title !== 'string' || entry.title.trim() === '') {
        throw new Error('Invalid OpenLibrary works title');
      }
      const title = entry.title.trim();
      const normalizedTitle = normalizeTitleKey(title);
      const score = scoreTitleMatch(normalizedQuery, normalizedTitle);
      if (normalizedQuery && score === 0) {
        return null;
      }
      const year =
        typeof entry.first_publish_year === 'number'
          ? entry.first_publish_year
          : undefined;
      const label = year ? `${title} (${year})` : title;
      const keyValue =
        typeof entry.key === 'string' && entry.key.trim() !== ''
          ? entry.key
          : title;
      return {
        id: keyValue,
        label,
        value: title,
        score,
      };
    })
    .filter(
      (
        entry,
      ): entry is { id: string; label: string; value: string; score: number } =>
        entry !== null,
    );

  mapped.sort((left, right) => {
    if (left.score !== right.score) {
      return right.score - left.score;
    }
    return left.label.localeCompare(right.label);
  });

  return mapped.slice(0, 8).map((entry) => ({
    id: entry.id,
    label: entry.label,
    value: entry.value,
  }));
};

export type { SuggestionEntry, ReleaseGroupEntry };
export {
  fetchSuggestions,
  parseGameSuggestions,
  parseTmdbSuggestions,
  parseMusicBrainzArtistSuggestions,
  fetchArtistReleaseGroups,
  parseOpenLibraryBookSuggestions,
  parseOpenLibraryAuthorSuggestions,
  parseOpenLibraryWorksSuggestions,
  normalizeTitleKey,
  scoreTitleMatch,
};
