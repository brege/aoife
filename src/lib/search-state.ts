import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMediaService } from '../media/factory';
import { getMediaProvider } from '../media/providers';
import type { MediaItem, MediaSearchValues, MediaType } from '../media/types';
import logger from './logger';

const constrainAspectRatio = (aspectRatio: number): number => {
  const MIN_RATIO = 0.5;
  const MAX_RATIO = 2;
  return Math.max(MIN_RATIO, Math.min(MAX_RATIO, aspectRatio));
};

type UseSearchStateOptions = {
  isBuilderMode: boolean;
};

export type UseSearchStateReturn = {
  selectedMediaType: MediaType;
  searchValues: MediaSearchValues;
  searchResults: MediaItem[];
  searchResultAspectRatios: Record<string | number, number>;
  lastSearchSummary: string;
  isLoading: boolean;
  error: string;
  setSelectedMediaType: (mediaType: MediaType) => void;
  runSearch: (
    values: Partial<MediaSearchValues>,
    mediaTypeOverride?: MediaType,
  ) => Promise<MediaItem[]>;
  handleFieldChange: (fieldId: string, value: string) => void;
  handleSearchResultImageLoad: (
    resultId: string | number,
    event: React.SyntheticEvent<HTMLImageElement>,
  ) => void;
  closeSearchResults: () => void;
  provider: ReturnType<typeof getMediaProvider>;
  searchInputRef: React.RefObject<HTMLInputElement>;
  /** @internal - for grid operations */
  setSearchResults: (results: MediaItem[]) => void;
  /** @internal - for grid operations */
  setSearchValues: (
    values:
      | MediaSearchValues
      | ((prev: MediaSearchValues) => MediaSearchValues),
  ) => void;
};

export const useSearchState = (
  options: UseSearchStateOptions,
): UseSearchStateReturn => {
  const { isBuilderMode } = options;

  const [selectedMediaType, setSelectedMediaType] =
    useState<MediaType>('movies');
  const provider = useMemo(
    () => getMediaProvider(selectedMediaType),
    [selectedMediaType],
  );
  const [searchValues, setSearchValues] = useState<MediaSearchValues>(
    provider.defaultSearchValues,
  );
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [searchResultAspectRatios, setSearchResultAspectRatios] = useState<
    Record<string | number, number>
  >({});
  const [lastSearchSummary, setLastSearchSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
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
        Object.entries(merged).filter(([, v]) => v !== undefined),
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

      setIsLoading(true);
      setError('');

      try {
        const service = getMediaService(activeMediaType);
        const results = await service.search(mergedValues);

        logger.info(`SEARCH: Found ${results.length} results`, {
          context: 'useSearchState.runSearch',
          action: 'search_results',
          mediaType: activeMediaType,
          values: mergedValues,
          resultsCount: results.length,
          timestamp: Date.now(),
        });

        if (mediaTypeOverride && mediaTypeOverride !== selectedMediaType) {
          setSelectedMediaType(mediaTypeOverride);
        }

        setSearchValues(mergedValues);
        setSearchResults(results);
        setLastSearchSummary(
          formatSearchSummary(mergedValues, activeProvider.searchFields),
        );
        return results;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const friendly = message.includes('not yet implemented')
          ? `${activeProvider.label} search is not configured yet. Wire up its cover API to enable it.`
          : 'An error occurred while searching.';

        setError(friendly);
        setSearchResults([]);

        logger.error('Search request failed', {
          context: 'useSearchState.runSearch',
          mediaType: activeMediaType,
          values: mergedValues,
          error: message,
        });
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [
      mergeSearchValues,
      resolveProvider,
      selectedMediaType,
      formatSearchSummary,
    ],
  );

  const handleFieldChange = useCallback((fieldId: string, value: string) => {
    setSearchValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  }, []);

  const handleSearchResultImageLoad = useCallback(
    (
      resultId: string | number,
      event: React.SyntheticEvent<HTMLImageElement>,
    ) => {
      const img = event.currentTarget;
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        const constrainedRatio = constrainAspectRatio(aspectRatio);
        setSearchResultAspectRatios((prev) => ({
          ...prev,
          [resultId]: constrainedRatio,
        }));
      }
    },
    [],
  );

  const closeSearchResults = useCallback(() => {
    logger.debug('Closing search results', {
      context: 'useSearchState.closeSearchResults',
    });
    setSearchResults([]);
    setSearchResultAspectRatios({});
  }, []);

  useEffect(() => {
    setSearchValues(provider.defaultSearchValues);
    setSearchResults([]);
    setLastSearchSummary('');
    if (isBuilderMode) {
      searchInputRef.current?.focus();
    }
  }, [provider, isBuilderMode]);

  return {
    selectedMediaType,
    searchValues,
    searchResults,
    searchResultAspectRatios,
    lastSearchSummary,
    isLoading,
    error,
    setSelectedMediaType,
    runSearch,
    handleFieldChange,
    handleSearchResultImageLoad,
    closeSearchResults,
    provider,
    searchInputRef,
    setSearchResults,
    setSearchValues,
  };
};
