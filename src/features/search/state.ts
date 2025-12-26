import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import logger from '../../lib/logger';
import { MEDIA_TYPE_STORAGE_KEY } from '../../lib/state/storage';
import { getMediaProvider } from '../../providers';
import { useMediaSearch } from '../../providers/queries';
import type {
  MediaItem,
  MediaSearchValues,
  MediaType,
} from '../../providers/types';

const constrainAspectRatio = (aspectRatio: number): number => {
  const minimumRatio = 0.5;
  const maximumRatio = 2;
  return Math.max(minimumRatio, Math.min(maximumRatio, aspectRatio));
};

type UseSearchStateOptions = {
  showSearch: boolean;
};

export type UseSearchStateReturn = {
  selectedMediaType: MediaType;
  searchResults: MediaItem[];
  brokenSearchResultIds: Record<string | number, true>;
  searchResultAspectRatios: Record<string | number, number>;
  lastSearchSummary: string;
  isLoading: boolean;
  error: string;
  setSelectedMediaType: (mediaType: MediaType) => void;
  runSearch: (
    values: Partial<MediaSearchValues>,
    mediaTypeOverride?: MediaType,
  ) => Promise<MediaItem[]>;
  handleSearchResultImageLoad: (
    resultId: string | number,
    event: React.SyntheticEvent<HTMLImageElement>,
  ) => void;
  handleSearchResultImageError: (resultId: string | number) => void;
  closeSearchResults: () => void;
  provider: ReturnType<typeof getMediaProvider>;
  searchInputRef: React.RefObject<HTMLInputElement>;
  setSearchResults: (results: MediaItem[]) => void;
};

export const useSearchState = (
  options: UseSearchStateOptions,
): UseSearchStateReturn => {
  const { showSearch } = options;
  const defaultMediaType: MediaType = 'movies';
  const resolveStoredMediaType = (): MediaType => {
    const stored = localStorage.getItem(MEDIA_TYPE_STORAGE_KEY);
    if (
      stored === 'movies' ||
      stored === 'tv' ||
      stored === 'books' ||
      stored === 'music' ||
      stored === 'games' ||
      stored === 'custom'
    ) {
      return stored;
    }
    return defaultMediaType;
  };

  const [selectedMediaType, setSelectedMediaType] = useState<MediaType>(
    resolveStoredMediaType,
  );
  const provider = useMemo(
    () => getMediaProvider(selectedMediaType),
    [selectedMediaType],
  );
  const mediaSearch = useMediaSearch();
  const [brokenSearchResultIds, setBrokenSearchResultIds] = useState<
    Record<string | number, true>
  >({});
  const [searchResultAspectRatios, setSearchResultAspectRatios] = useState<
    Record<string | number, number>
  >({});
  const [lastSearchSummary, setLastSearchSummary] = useState('');
  const [friendlyError, setFriendlyError] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const resolveProvider = useCallback(
    (mediaType: MediaType) =>
      mediaType === selectedMediaType ? provider : getMediaProvider(mediaType),
    [provider, selectedMediaType],
  );

  const mergeSearchValues = useCallback(
    (values: Partial<MediaSearchValues>, mediaType: MediaType) => {
      const targetProvider = resolveProvider(mediaType);
      const merged = {
        ...targetProvider.defaultSearchValues,
        ...values,
      };
      return Object.fromEntries(
        Object.entries(merged).filter(([, value]) => value !== undefined),
      ) as MediaSearchValues;
    },
    [resolveProvider],
  );

  const formatSearchSummary = useCallback(
    (values: MediaSearchValues, selectedFields: { id: string }[]) => {
      const parts = selectedFields
        .map((field) => values[field.id]?.trim())
        .filter(Boolean);
      return parts.join(' • ');
    },
    [],
  );

  const runSearch = useCallback(
    async (
      values: Partial<MediaSearchValues>,
      mediaTypeOverride?: MediaType,
    ) => {
      const activeMediaType = mediaTypeOverride ?? selectedMediaType;
      const activeProvider = resolveProvider(activeMediaType);
      const mergedValues = mergeSearchValues(values, activeMediaType);

      setFriendlyError('');
      setSearchResultAspectRatios({});
      setBrokenSearchResultIds({});

      try {
        const results = await mediaSearch.search(activeMediaType, mergedValues);

        logger.info(
          {
            context: 'useSearchState.runSearch',
            action: 'search_results',
            mediaType: activeMediaType,
            values: mergedValues,
            resultsCount: results.length,
            timestamp: Date.now(),
          },
          `SEARCH: Found ${results.length} results`,
        );

        if (mediaTypeOverride && mediaTypeOverride !== selectedMediaType) {
          setSelectedMediaType(mediaTypeOverride);
        }

        setLastSearchSummary(
          formatSearchSummary(mergedValues, activeProvider.searchFields),
        );
        return results;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const friendly = message.includes('not yet implemented')
          ? `${activeProvider.label} search is not configured yet. Wire up its cover API to enable it.`
          : 'An error occurred while searching.';

        setFriendlyError(friendly);

        logger.error(
          {
            context: 'useSearchState.runSearch',
            mediaType: activeMediaType,
            values: mergedValues,
            error: message,
          },
          'Search request failed',
        );
        return [];
      }
    },
    [
      mediaSearch,
      mergeSearchValues,
      resolveProvider,
      selectedMediaType,
      formatSearchSummary,
    ],
  );

  const handleSearchResultImageLoad = useCallback(
    (
      resultId: string | number,
      event: React.SyntheticEvent<HTMLImageElement>,
    ) => {
      const imageElement = event.currentTarget;
      if (imageElement.naturalWidth > 0 && imageElement.naturalHeight > 0) {
        const aspectRatio =
          imageElement.naturalWidth / imageElement.naturalHeight;
        const constrainedRatio = constrainAspectRatio(aspectRatio);
        setSearchResultAspectRatios((prev) => ({
          ...prev,
          [resultId]: constrainedRatio,
        }));
      }
    },
    [],
  );

  const handleSearchResultImageError = useCallback(
    (resultId: string | number) => {
      setBrokenSearchResultIds((current) => {
        if (Object.hasOwn(current, resultId)) {
          return current;
        }
        const next = { ...current } as Record<string | number, true>;
        next[resultId] = true;
        return next;
      });
    },
    [],
  );

  const closeSearchResults = useCallback(() => {
    logger.debug(
      {
        context: 'useSearchState.closeSearchResults',
      },
      'Closing search results',
    );
    mediaSearch.reset();
    setSearchResultAspectRatios({});
  }, [mediaSearch]);

  useEffect(() => {
    localStorage.setItem(MEDIA_TYPE_STORAGE_KEY, selectedMediaType);
  }, [selectedMediaType]);

  useEffect(() => {
    if (showSearch) {
      searchInputRef.current?.focus();
    }
  }, [showSearch]);

  const displayError = friendlyError || mediaSearch.error;

  return {
    selectedMediaType,
    searchResults: mediaSearch.data,
    brokenSearchResultIds,
    searchResultAspectRatios,
    lastSearchSummary,
    isLoading: mediaSearch.isLoading,
    error: displayError,
    setSelectedMediaType,
    runSearch,
    handleSearchResultImageLoad,
    handleSearchResultImageError,
    closeSearchResults,
    provider,
    searchInputRef,
    setSearchResults: mediaSearch.setData,
  };
};
