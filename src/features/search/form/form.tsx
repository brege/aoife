import { Combobox } from '@headlessui/react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaLink } from 'react-icons/fa';
import { MdDriveFolderUpload } from 'react-icons/md';
import { RiPhoneFindLine } from 'react-icons/ri';
import { storeImage } from '../../../lib/indexeddb';
import type { MediaSearchValues, MediaType } from '../../../media/types';
import Dropdown from '../suggestion/list';
import { Platform } from './platform';
import './form.css';

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

type SuggestionResponseParser = (
  response: Response,
) => Promise<SuggestionEntry[]>;

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

interface MediaFormProps {
  mediaType: MediaType;
  onMediaTypeChange: (type: MediaType) => void;
  searchValues: MediaSearchValues;
  onFieldChange: (fieldId: string, value: string) => void;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  isLoading: boolean;
  provider: {
    label: string;
    searchFields: {
      id: string;
      label: string;
      placeholder: string;
      required?: boolean;
    }[];
  };
  layout: 'band' | 'stack';
  bandPlacement?: 'top' | 'bottom';
  onOpenCoverLink?: () => void;
}

export const MediaForm: React.FC<MediaFormProps> = ({
  mediaType,
  onMediaTypeChange,
  searchValues,
  onFieldChange,
  onSubmit,
  isLoading,
  provider,
  layout,
  bandPlacement = 'top',
  onOpenCoverLink,
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [titleSuggestions, setTitleSuggestions] = useState<SuggestionEntry[]>(
    [],
  );
  const [isLoadingTitleSuggestions, setIsLoadingTitleSuggestions] =
    useState(false);
  const [artistSuggestions, setArtistSuggestions] = useState<SuggestionEntry[]>(
    [],
  );
  const [albumSuggestions, setAlbumSuggestions] = useState<SuggestionEntry[]>(
    [],
  );
  const [isLoadingArtistSuggestions, setIsLoadingArtistSuggestions] =
    useState(false);
  const [isLoadingAlbumSuggestions, setIsLoadingAlbumSuggestions] =
    useState(false);
  const [artistReleaseGroups, setArtistReleaseGroups] = useState<{
    artistId: string;
    entries: ReleaseGroupEntry[];
  } | null>(null);
  const [isLoadingArtistReleaseGroups, setIsLoadingArtistReleaseGroups] =
    useState(false);
  const [bookTitleSuggestions, setBookTitleSuggestions] = useState<
    SuggestionEntry[]
  >([]);
  const [isLoadingBookTitleSuggestions, setIsLoadingBookTitleSuggestions] =
    useState(false);
  const [authorSuggestions, setAuthorSuggestions] = useState<SuggestionEntry[]>(
    [],
  );
  const [isLoadingAuthorSuggestions, setIsLoadingAuthorSuggestions] =
    useState(false);
  const [selectedArtistIdentifier, setSelectedArtistIdentifier] = useState<
    string | null
  >(null);
  const [selectedAuthorKeys, setSelectedAuthorKeys] = useState<string[]>([]);
  const queryValue = useMemo(
    () => String(searchValues.query ?? ''),
    [searchValues.query],
  );
  const artistValue = useMemo(
    () => String(searchValues.artist ?? ''),
    [searchValues.artist],
  );
  const authorValue = useMemo(
    () => String(searchValues.author ?? ''),
    [searchValues.author],
  );
  const albumValue = useMemo(
    () => String(searchValues.album ?? ''),
    [searchValues.album],
  );
  const bookTitleValue = useMemo(
    () => String(searchValues.title ?? ''),
    [searchValues.title],
  );
  const platformValue = useMemo(
    () => String(searchValues.platform ?? '').trim(),
    [searchValues.platform],
  );

  const handleCoverImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const imageId = `img-${Date.now()}-${file.name}`;
        await storeImage(imageId, file);
        onFieldChange('cover', imageId);
        if (!searchValues.query) {
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          onFieldChange('query', nameWithoutExt);
        }
      }
    },
    [searchValues.query, onFieldChange],
  );

  useEffect(() => {
    if (mediaType !== 'movies' && mediaType !== 'tv' && mediaType !== 'games') {
      setTitleSuggestions([]);
      return;
    }

    const trimmedQuery = queryValue.trim();
    if (trimmedQuery.length < 2) {
      setTitleSuggestions([]);
      return;
    }

    let isCancelled = false;
    const requestKey = `${mediaType}|${trimmedQuery}|${platformValue}`;
    const timeoutId = window.setTimeout(() => {
      setIsLoadingTitleSuggestions(true);
      const endpoint = (() => {
        if (mediaType === 'games') {
          const params = new URLSearchParams({
            name: trimmedQuery,
          });
          if (platformValue) {
            params.set('filter[platform]', platformValue);
          }
          return `/api/gamesdb/v1/Games/ByGameName?${params.toString()}`;
        }
        const searchPath = mediaType === 'tv' ? 'search/tv' : 'search/movie';
        return `/api/tmdb/3/${searchPath}?query=${encodeURIComponent(
          trimmedQuery,
        )}`;
      })();

      const parser =
        mediaType === 'games'
          ? parseGameSuggestions
          : parseTmdbSuggestions(mediaType);

      fetchSuggestions(requestKey, endpoint, parser)
        .then((mapped) => {
          if (isCancelled) {
            return;
          }
          setTitleSuggestions(mapped);
        })
        .finally(() => {
          if (!isCancelled) {
            setIsLoadingTitleSuggestions(false);
          }
        });
    }, 350);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [mediaType, platformValue, queryValue]);

  useEffect(() => {
    if (mediaType !== 'music') {
      setArtistSuggestions([]);
      setAlbumSuggestions([]);
      setSelectedArtistIdentifier(null);
      setArtistReleaseGroups(null);
      return;
    }

    const trimmedArtist = artistValue.trim();
    if (trimmedArtist.length < 2) {
      setArtistSuggestions([]);
      setSelectedArtistIdentifier(null);
      setAlbumSuggestions([]);
      return;
    }

    let isCancelled = false;
    const requestKey = `music-artist|${trimmedArtist}`;
    const timeoutId = window.setTimeout(() => {
      setIsLoadingArtistSuggestions(true);
      const params = new URLSearchParams({
        query: `artist:"${trimmedArtist}"`,
        fmt: 'json',
        limit: '8',
      });
      const endpoint = `https://musicbrainz.org/ws/2/artist?${params.toString()}`;

      fetchSuggestions(requestKey, endpoint, parseMusicBrainzArtistSuggestions)
        .then((mapped) => {
          if (isCancelled) {
            return;
          }
          setArtistSuggestions(mapped);
        })
        .finally(() => {
          if (!isCancelled) {
            setIsLoadingArtistSuggestions(false);
          }
        });
    }, 350);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [mediaType, artistValue]);

  useEffect(() => {
    if (!selectedArtistIdentifier || mediaType !== 'music') {
      setArtistReleaseGroups(null);
      setIsLoadingArtistReleaseGroups(false);
      return;
    }

    let isCancelled = false;
    setIsLoadingArtistReleaseGroups(true);
    fetchArtistReleaseGroups(selectedArtistIdentifier)
      .then((entries) => {
        if (isCancelled) {
          return;
        }
        setArtistReleaseGroups({
          artistId: selectedArtistIdentifier,
          entries,
        });
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingArtistReleaseGroups(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [mediaType, selectedArtistIdentifier]);

  useEffect(() => {
    if (mediaType !== 'music') {
      setAlbumSuggestions([]);
      setIsLoadingAlbumSuggestions(false);
      return;
    }

    const trimmedAlbum = albumValue.trim();
    if (!selectedArtistIdentifier || trimmedAlbum.length < 2) {
      setAlbumSuggestions([]);
      setIsLoadingAlbumSuggestions(false);
      return;
    }

    let isCancelled = false;
    const normalizedQuery = normalizeTitleKey(trimmedAlbum);
    const activeReleaseGroups =
      artistReleaseGroups?.artistId === selectedArtistIdentifier
        ? artistReleaseGroups.entries
        : [];

    setIsLoadingAlbumSuggestions(true);
    const timeoutId = window.setTimeout(() => {
      if (activeReleaseGroups.length > 0) {
        const mapped = activeReleaseGroups
          .map((entry) => {
            const normalizedTitle = normalizeTitleKey(entry.title);
            const score = scoreTitleMatch(normalizedQuery, normalizedTitle);
            if (normalizedQuery && score === 0) {
              return null;
            }
            const label = entry.year
              ? `${entry.title} (${entry.year})`
              : entry.title;
            return {
              id: entry.id,
              label,
              value: entry.title,
              score,
            };
          })
          .filter(
            (
              entry,
            ): entry is {
              id: string;
              label: string;
              value: string;
              score: number;
            } => entry !== null,
          );

        mapped.sort((left, right) => {
          if (left.score !== right.score) {
            return right.score - left.score;
          }
          return left.label.localeCompare(right.label);
        });

        if (!isCancelled) {
          setAlbumSuggestions(
            mapped.slice(0, 8).map((entry) => ({
              id: entry.id,
              label: entry.label,
              value: entry.value,
            })),
          );
          setIsLoadingAlbumSuggestions(false);
        }
        return;
      }

      if (!isLoadingArtistReleaseGroups) {
        setAlbumSuggestions([]);
        setIsLoadingAlbumSuggestions(false);
      }
    }, 200);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    albumValue,
    artistReleaseGroups,
    isLoadingArtistReleaseGroups,
    mediaType,
    selectedArtistIdentifier,
  ]);

  useEffect(() => {
    if (mediaType !== 'books') {
      setBookTitleSuggestions((current) =>
        current.length === 0 ? current : [],
      );
      setAuthorSuggestions((current) => (current.length === 0 ? current : []));
      setSelectedAuthorKeys((current) => (current.length === 0 ? current : []));
      return;
    }

    const trimmedTitle = bookTitleValue.trim();
    if (trimmedTitle.length < 2) {
      setBookTitleSuggestions([]);
      return;
    }

    let isCancelled = false;
    const trimmedAuthor = authorValue.trim();
    const authorKeySuffix = selectedAuthorKeys.join('|') || trimmedAuthor;
    const requestKey = `books-title|${trimmedTitle}|${authorKeySuffix}`;
    const timeoutId = window.setTimeout(() => {
      setIsLoadingBookTitleSuggestions(true);
      if (selectedAuthorKeys.length > 0) {
        const requests = selectedAuthorKeys.map((authorKey) => {
          const params = new URLSearchParams({ limit: '8' });
          const endpoint = `/api/openlibrary/authors/${authorKey}/works.json?${params.toString()}`;
          return fetchSuggestions(
            `${requestKey}|${authorKey}`,
            endpoint,
            (response) =>
              parseOpenLibraryWorksSuggestions(response, trimmedTitle),
          );
        });
        Promise.all(requests)
          .then((results) => {
            if (isCancelled) {
              return;
            }
            const combined = results.flat();
            const normalizedQuery = normalizeTitleKey(trimmedTitle);
            const unique = new Map<string, SuggestionEntry>();
            combined.forEach((entry) => {
              const normalizedTitle = normalizeTitleKey(entry.value);
              if (!normalizedTitle) {
                return;
              }
              if (!unique.has(normalizedTitle)) {
                unique.set(normalizedTitle, entry);
              }
            });
            const sorted = Array.from(unique.values()).sort((left, right) => {
              const leftScore = scoreTitleMatch(
                normalizedQuery,
                normalizeTitleKey(left.value),
              );
              const rightScore = scoreTitleMatch(
                normalizedQuery,
                normalizeTitleKey(right.value),
              );
              if (leftScore !== rightScore) {
                return rightScore - leftScore;
              }
              return left.label.localeCompare(right.label);
            });
            setBookTitleSuggestions(sorted.slice(0, 8));
          })
          .finally(() => {
            if (!isCancelled) {
              setIsLoadingBookTitleSuggestions(false);
            }
          });
      } else {
        const params = new URLSearchParams({
          title: trimmedTitle,
          limit: '8',
        });
        if (trimmedAuthor) {
          params.set('author', trimmedAuthor);
        }
        const endpoint = `/api/openlibrary/search.json?${params.toString()}`;

        fetchSuggestions(requestKey, endpoint, parseOpenLibraryBookSuggestions)
          .then((mapped) => {
            if (isCancelled) {
              return;
            }
            setBookTitleSuggestions(mapped);
          })
          .finally(() => {
            if (!isCancelled) {
              setIsLoadingBookTitleSuggestions(false);
            }
          });
      }
    }, 350);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [mediaType, bookTitleValue, authorValue, selectedAuthorKeys]);

  useEffect(() => {
    if (mediaType !== 'books') {
      setAuthorSuggestions([]);
      return;
    }

    const trimmedAuthor = authorValue.trim();
    if (trimmedAuthor.length < 2) {
      setAuthorSuggestions([]);
      setSelectedAuthorKeys([]);
      return;
    }

    let isCancelled = false;
    const requestKey = `books-author|${trimmedAuthor}`;
    const timeoutId = window.setTimeout(() => {
      setIsLoadingAuthorSuggestions(true);
      const params = new URLSearchParams({
        q: trimmedAuthor,
        limit: '8',
      });
      const endpoint = `/api/openlibrary/search/authors.json?${params.toString()}`;

      fetchSuggestions(requestKey, endpoint, parseOpenLibraryAuthorSuggestions)
        .then((mapped) => {
          if (isCancelled) {
            return;
          }
          setAuthorSuggestions(mapped);
        })
        .finally(() => {
          if (!isCancelled) {
            setIsLoadingAuthorSuggestions(false);
          }
        });
    }, 350);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [mediaType, authorValue]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  const layoutClass = layout === 'band' ? 'band' : 'stack';
  const bandPlacementClass = layout === 'band' ? `band-${bandPlacement}` : '';

  return (
    <form
      className={`media-search-form ${layoutClass} ${bandPlacementClass}`}
      onSubmit={handleFormSubmit}
      data-testid={`media-search-form-${layout}`}
      ref={formRef}
    >
      {layout === 'stack' && (
        <Dropdown value={mediaType} onChange={onMediaTypeChange} />
      )}

      {layout === 'band' && (
        <Dropdown value={mediaType} onChange={onMediaTypeChange} />
      )}

      <div className="form-fields">
        {provider.searchFields.map((field) => {
          if (field.id === 'platform') {
            return (
              <Platform
                key={field.id}
                value={searchValues[field.id] ?? ''}
                onChange={(value) => onFieldChange(field.id, value)}
                placeholder={field.placeholder}
                ariaLabel={field.label}
              />
            );
          }

          if (field.id === 'author' && mediaType === 'books') {
            const comboboxPlacementClass =
              layout === 'band' ? `band-${bandPlacement}` : 'stack';
            return (
              <Combobox
                key={field.id}
                value={authorValue}
                onChange={(value) => {
                  const nextValue = value ?? '';
                  onFieldChange(field.id, nextValue);
                  if (!nextValue) {
                    setSelectedAuthorKeys([]);
                    setBookTitleSuggestions([]);
                    return;
                  }
                  const matchingSuggestion = authorSuggestions.find(
                    (suggestion) => suggestion.value === nextValue,
                  );
                  if (!matchingSuggestion) {
                    setSelectedAuthorKeys([]);
                    return;
                  }
                  if (!matchingSuggestion.authorKeys) {
                    throw new Error('Missing OpenLibrary author keys');
                  }
                  setSelectedAuthorKeys(matchingSuggestion.authorKeys);
                }}
                as="div"
                className={`combobox ${comboboxPlacementClass}`.trim()}
              >
                <Combobox.Input
                  type="text"
                  value={authorValue}
                  onChange={(e) => {
                    onFieldChange(field.id, e.target.value);
                    setSelectedAuthorKeys([]);
                    setBookTitleSuggestions([]);
                  }}
                  placeholder={field.placeholder}
                  aria-label={field.label}
                  className="form-input"
                  required={field.required}
                  data-testid={`search-field-${field.id}`}
                />
                {authorSuggestions.length > 0 && (
                  <Combobox.Options className="combobox-options">
                    {authorSuggestions.map((suggestion) => {
                      return (
                        <Combobox.Option
                          key={suggestion.id}
                          value={suggestion.value}
                          className={({ active }) =>
                            `combobox-option${active ? ' active' : ''}`
                          }
                        >
                          <span className="combobox-option-label">
                            {suggestion.label}
                          </span>
                        </Combobox.Option>
                      );
                    })}
                  </Combobox.Options>
                )}
                {isLoadingAuthorSuggestions &&
                  authorSuggestions.length === 0 && (
                    <div className="combobox-loading">Searching...</div>
                  )}
              </Combobox>
            );
          }

          if (
            field.id === 'query' &&
            (mediaType === 'movies' ||
              mediaType === 'tv' ||
              mediaType === 'games')
          ) {
            const comboboxPlacementClass =
              layout === 'band' ? `band-${bandPlacement}` : 'stack';
            return (
              <Combobox
                key={field.id}
                value={queryValue}
                onChange={(value) => {
                  onFieldChange(field.id, value ?? '');
                  formRef.current?.requestSubmit();
                }}
                as="div"
                className={`combobox ${comboboxPlacementClass}`.trim()}
              >
                <Combobox.Input
                  type="text"
                  value={queryValue}
                  onChange={(e) => onFieldChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  aria-label={field.label}
                  className="form-input"
                  required={field.required}
                  data-testid={`search-field-${field.id}`}
                />
                {titleSuggestions.length > 0 && (
                  <Combobox.Options className="combobox-options">
                    {titleSuggestions.map((suggestion) => {
                      return (
                        <Combobox.Option
                          key={suggestion.id}
                          value={suggestion.value}
                          className={({ active }) =>
                            `combobox-option${active ? ' active' : ''}`
                          }
                        >
                          <span className="combobox-option-label">
                            {suggestion.label}
                          </span>
                        </Combobox.Option>
                      );
                    })}
                  </Combobox.Options>
                )}
                {isLoadingTitleSuggestions && titleSuggestions.length === 0 && (
                  <div className="combobox-loading">Searching...</div>
                )}
              </Combobox>
            );
          }

          if (field.id === 'artist' && mediaType === 'music') {
            const comboboxPlacementClass =
              layout === 'band' ? `band-${bandPlacement}` : 'stack';
            return (
              <Combobox
                key={field.id}
                value={artistValue}
                onChange={(value) => {
                  const nextValue = value ?? '';
                  onFieldChange(field.id, nextValue);
                  if (!nextValue) {
                    setSelectedArtistIdentifier(null);
                    setAlbumSuggestions([]);
                    setArtistReleaseGroups(null);
                    setIsLoadingAlbumSuggestions(false);
                    onFieldChange('releaseGroupId', '');
                    return;
                  }
                  const matchingSuggestion = artistSuggestions.find(
                    (suggestion) => suggestion.value === nextValue,
                  );
                  if (!matchingSuggestion) {
                    throw new Error('Selected artist not found in suggestions');
                  }
                  if (typeof matchingSuggestion.id !== 'string') {
                    throw new Error('Invalid MusicBrainz artist identifier');
                  }
                  setSelectedArtistIdentifier(matchingSuggestion.id);
                  setAlbumSuggestions([]);
                  setArtistReleaseGroups(null);
                  setIsLoadingAlbumSuggestions(false);
                  onFieldChange('releaseGroupId', '');
                }}
                as="div"
                className={`combobox ${comboboxPlacementClass}`.trim()}
              >
                <Combobox.Input
                  type="text"
                  value={artistValue}
                  onChange={(e) => {
                    onFieldChange(field.id, e.target.value);
                    setSelectedArtistIdentifier(null);
                    setAlbumSuggestions([]);
                    setIsLoadingAlbumSuggestions(false);
                    onFieldChange('releaseGroupId', '');
                  }}
                  placeholder={field.placeholder}
                  aria-label={field.label}
                  className="form-input"
                  required={field.required}
                  data-testid={`search-field-${field.id}`}
                />
                {artistSuggestions.length > 0 && (
                  <Combobox.Options className="combobox-options">
                    {artistSuggestions.map((suggestion) => {
                      return (
                        <Combobox.Option
                          key={suggestion.id}
                          value={suggestion.value}
                          className={({ active }) =>
                            `combobox-option${active ? ' active' : ''}`
                          }
                        >
                          <span className="combobox-option-label">
                            {suggestion.label}
                          </span>
                        </Combobox.Option>
                      );
                    })}
                  </Combobox.Options>
                )}
                {isLoadingArtistSuggestions &&
                  artistSuggestions.length === 0 && (
                    <div className="combobox-loading">Searching...</div>
                  )}
              </Combobox>
            );
          }

          if (
            field.id === 'title' &&
            mediaType === 'books' &&
            onOpenCoverLink
          ) {
            const comboboxPlacementClass =
              layout === 'band' ? `band-${bandPlacement}` : 'stack';
            return (
              <div key={field.id} className="input-with-button">
                <Combobox
                  value={bookTitleValue}
                  onChange={(value) => {
                    onFieldChange(field.id, value ?? '');
                    window.setTimeout(() => {
                      formRef.current?.requestSubmit();
                    }, 0);
                  }}
                  as="div"
                  className={`combobox ${comboboxPlacementClass}`.trim()}
                >
                  <Combobox.Input
                    type="text"
                    value={bookTitleValue}
                    onChange={(e) => onFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    aria-label={field.label}
                    className="form-input"
                    required={field.required}
                    data-testid={`search-field-${field.id}`}
                  />
                  {bookTitleSuggestions.length > 0 && (
                    <Combobox.Options className="combobox-options">
                      {bookTitleSuggestions.map((suggestion) => {
                        return (
                          <Combobox.Option
                            key={suggestion.id}
                            value={suggestion.value}
                            className={({ active }) =>
                              `combobox-option${active ? ' active' : ''}`
                            }
                          >
                            <span className="combobox-option-label">
                              {suggestion.label}
                            </span>
                          </Combobox.Option>
                        );
                      })}
                    </Combobox.Options>
                  )}
                  {isLoadingBookTitleSuggestions &&
                    bookTitleSuggestions.length === 0 && (
                      <div className="combobox-loading">Searching...</div>
                    )}
                </Combobox>
                <button
                  type="button"
                  onClick={onOpenCoverLink}
                  className="icon-button"
                  aria-label="Add cover link"
                  title="Add cover link"
                >
                  <FaLink size={18} />
                </button>
              </div>
            );
          }

          if (
            field.id === 'album' &&
            mediaType === 'music' &&
            onOpenCoverLink
          ) {
            const comboboxPlacementClass =
              layout === 'band' ? `band-${bandPlacement}` : 'stack';
            return (
              <div key={field.id} className="input-with-button">
                <Combobox
                  value={albumValue}
                  onChange={(value) => {
                    const nextValue = value ?? '';
                    onFieldChange(field.id, nextValue);
                    if (!nextValue) {
                      onFieldChange('releaseGroupId', '');
                    } else {
                      const matchingSuggestion = albumSuggestions.find(
                        (suggestion) => suggestion.value === nextValue,
                      );
                      if (
                        matchingSuggestion &&
                        typeof matchingSuggestion.id === 'string'
                      ) {
                        onFieldChange('releaseGroupId', matchingSuggestion.id);
                      } else {
                        onFieldChange('releaseGroupId', '');
                      }
                    }
                    window.setTimeout(() => {
                      formRef.current?.requestSubmit();
                    }, 0);
                  }}
                  as="div"
                  className={`combobox ${comboboxPlacementClass}`.trim()}
                >
                  <Combobox.Input
                    type="text"
                    value={albumValue}
                    onChange={(e) => {
                      onFieldChange(field.id, e.target.value);
                      onFieldChange('releaseGroupId', '');
                    }}
                    placeholder={field.placeholder}
                    aria-label={field.label}
                    className="form-input"
                    required={field.required}
                    data-testid={`search-field-${field.id}`}
                  />
                  {albumSuggestions.length > 0 && (
                    <Combobox.Options className="combobox-options">
                      {albumSuggestions.map((suggestion) => {
                        return (
                          <Combobox.Option
                            key={suggestion.id}
                            value={suggestion.value}
                            className={({ active }) =>
                              `combobox-option${active ? ' active' : ''}`
                            }
                          >
                            <span className="combobox-option-label">
                              {suggestion.label}
                            </span>
                          </Combobox.Option>
                        );
                      })}
                    </Combobox.Options>
                  )}
                {isLoadingAlbumSuggestions &&
                  albumSuggestions.length === 0 && (
                    <div className="combobox-loading">Searching...</div>
                  )}
                </Combobox>
                <button
                  type="button"
                  onClick={onOpenCoverLink}
                  className="icon-button"
                  aria-label="Add cover link"
                  title="Add cover link"
                >
                  <FaLink size={18} />
                </button>
              </div>
            );
          }

          if (field.id === 'cover' && mediaType === 'custom') {
            return (
              <div key={field.id} className="input-with-button">
                <input
                  type="text"
                  value={searchValues[field.id] ?? ''}
                  onChange={(e) => onFieldChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  aria-label={field.label}
                  className="form-input"
                  required={field.required}
                  data-testid="search-field-cover"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageUpload}
                  style={{ display: 'none' }}
                  id="cover-file-input"
                  ref={coverInputRef}
                  aria-label="Upload cover image"
                  data-testid="cover-file-input"
                />
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="icon-button"
                  aria-label="Upload image"
                  title="Upload image"
                  data-testid="cover-upload-trigger"
                >
                  <MdDriveFolderUpload size={20} />
                </button>
              </div>
            );
          }

          return (
            <input
              key={field.id}
              type="text"
              value={searchValues[field.id] ?? ''}
              onChange={(e) => onFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              aria-label={field.label}
              className="form-input"
              required={field.required}
              data-testid={`search-field-${field.id}`}
            />
          );
        })}
      </div>

      <button
        type="submit"
        className="form-submit-button"
        disabled={isLoading}
        data-testid="search-submit"
      >
        {mediaType === 'custom' ? (
          isLoading ? (
            'Uploading...'
          ) : (
            'Add image'
          )
        ) : isLoading ? (
          'Searching...'
        ) : (
          <>
            <RiPhoneFindLine
              className="form-submit-icon"
              aria-hidden="true"
            />
            <span>
              {mediaType === 'music'
                ? 'Cover art'
                : mediaType === 'movies'
                  ? 'Poster'
                  : mediaType === 'tv'
                    ? 'Poster'
                    : mediaType === 'books'
                      ? 'Cover art'
                      : mediaType === 'games'
                        ? 'Box art'
                        : provider.label}
            </span>
          </>
        )}
      </button>
    </form>
  );
};
