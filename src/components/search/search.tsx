import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MdClose } from 'react-icons/md';
import '../../app/styles/global.css';
import './search.css';
import { type CliMenuState, useCliBridge } from '../../lib/api';
import logger from '../../lib/logger';
import { useModalClosed, useModalManager } from '../../lib/modalmanager';
import { getMediaService } from '../../media/factory';
import { getMediaProvider } from '../../media/providers';
import type {
  MediaItem,
  MediaSearchValues,
  MediaType,
} from '../../media/types';
import Grid2x2 from '../grid/grid';
import AppHeader from '../ui/header';
import { MediaSearchForm } from './mediasearchform';

const GRID_STORAGE_KEY = 'gridItems';
const COLUMNS_STORAGE_KEY = 'gridColumns';
const MIN_ROWS_STORAGE_KEY = 'gridMinRows';
const GRID_CAPACITY = 4;

type TestApplicationApi = {
  setMediaType: (mediaType: MediaType) => void;
  search: (
    values: Partial<MediaSearchValues>,
    mediaType?: MediaType,
  ) => Promise<MediaItem[]>;
  applySearchResults: (
    results: MediaItem[],
    mediaType?: MediaType,
    summary?: string,
  ) => void;
  addMedia: (media: MediaItem, availableCovers?: MediaItem[]) => void;
  removeMedia: (mediaId: string | number) => void;
  clearGrid: () => void;
  getGridItems: () => MediaItem[];
  getStoredGridItems: () => MediaItem[];
  setBuilderMode: (enabled: boolean) => void;
  getBuilderMode: () => boolean;
  getSearchValues: () => MediaSearchValues;
};

type WindowWithTestApi = Window & {
  appTestApi?: TestApplicationApi;
};

const formatSearchSummary = (
  values: MediaSearchValues,
  selectedFields: { id: string }[],
) => {
  const parts = selectedFields
    .map((field) => values[field.id]?.trim())
    .filter(Boolean);
  return parts.join(' • ');
};

const constrainAspectRatio = (aspectRatio: number): number => {
  const MIN_RATIO = 0.5;
  const MAX_RATIO = 2;
  return Math.max(MIN_RATIO, Math.min(MAX_RATIO, aspectRatio));
};

type ExternalLink = {
  href: string;
  label: string;
  domain: string;
};

const getExternalLinks = (
  result: MediaItem,
  mediaType: MediaType,
  imdbId?: string,
): ExternalLink[] => {
  const links: ExternalLink[] = [];

  if (mediaType === 'movies' || mediaType === 'tv') {
    links.push({
      href: `https://www.themoviedb.org/${mediaType === 'tv' ? 'tv' : 'movie'}/${result.id}`,
      label: 'TMDB',
      domain: 'www.themoviedb.org',
    });

    if (mediaType === 'movies') {
      links.push({
        href: `https://letterboxd.com/tmdb/${result.id}`,
        label: 'Letterboxd',
        domain: 'letterboxd.com',
      });
    }

    if (imdbId) {
      links.push({
        href: `https://www.imdb.com/title/${imdbId}/`,
        label: 'IMDb',
        domain: 'www.imdb.com',
      });
    }
  }

  if (mediaType === 'books') {
    if (
      result.source === 'OpenLibrary' &&
      typeof result.metadata?.openLibraryKey === 'string'
    ) {
      links.push({
        href: `https://openlibrary.org${result.metadata.openLibraryKey}`,
        label: 'Open Library',
        domain: 'openlibrary.org',
      });
    } else if (
      result.source === 'GoogleBooks' &&
      typeof result.metadata?.volumeId === 'string'
    ) {
      links.push({
        href: `https://books.google.com/books?id=${result.metadata.volumeId}`,
        label: 'Google Books',
        domain: 'books.google.com',
      });
    }
  }

  if (mediaType === 'music' && typeof result.metadata?.mbid === 'string') {
    links.push({
      href: `https://musicbrainz.org/release/${result.metadata.mbid}`,
      label: 'MusicBrainz',
      domain: 'musicbrainz.org',
    });
  }

  if (mediaType === 'games') {
    links.push({
      href: `https://thegamesdb.net/game.php?id=${result.id}`,
      label: 'TheGamesDB',
      domain: 'thegamesdb.net',
    });
  }

  return links;
};

const MediaSearch: React.FC = () => {
  useEffect(() => {
    logger.setDebugMode(true);
    logger.info('MediaSearch component initialized', {
      context: 'MediaSearch',
    });
  }, []);

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
  const [gridItems, setGridItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [alternateCoverUrls, setAlternateCoverUrls] = useState<string[]>([]);
  const [showPosterGrid, setShowPosterGrid] = useState(false);
  const [activePosterItemId, setActivePosterItemId] = useState<
    string | number | null
  >(null);
  const activePosterItem = useMemo(
    () => gridItems.find((item) => item.id === activePosterItemId) ?? null,
    [gridItems, activePosterItemId],
  );
  const [columns, setColumns] = useState(() => {
    const stored = localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 8) {
        return parsed;
      }
    }
    return 4;
  });
  const [minRows, setMinRows] = useState(() => {
    const stored = localStorage.getItem(MIN_ROWS_STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 6) {
        return parsed;
      }
    }
    return 2;
  });
  const [lastSearchSummary, setLastSearchSummary] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isBuilderMode, setIsBuilderMode] = useState(true);

  const resolveProvider = useCallback(
    (mediaType: MediaType) =>
      mediaType === selectedMediaType
        ? provider
        : getMediaProvider(mediaType),
    [provider, selectedMediaType],
  );

  const mergeSearchValues = useCallback(
    (values: Partial<MediaSearchValues>, mediaType: MediaType) => {
      const targetProvider = resolveProvider(mediaType);
      const merged = {
        ...targetProvider.defaultSearchValues,
        ...values,
      };
      // Filter out undefined values
      return Object.fromEntries(
        Object.entries(merged).filter(([, v]) => v !== undefined),
      ) as MediaSearchValues;
    },
    [resolveProvider],
  );

  useEffect(() => {
    const stored = localStorage.getItem(GRID_STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as MediaItem[];
      if (Array.isArray(parsed)) {
        setGridItems(parsed);
      }
    } catch (storageError) {
      logger.error('Failed to parse stored grid items', {
        context: 'MediaSearch.storageLoad',
        error:
          storageError instanceof Error
            ? storageError.message
            : String(storageError),
      });
    }
  }, []);

  useEffect(() => {
    setSearchValues(provider.defaultSearchValues);
    setSearchResults([]);
    setLastSearchSummary('');
    if (isBuilderMode) {
      searchInputRef.current?.focus();
    }
  }, [provider, isBuilderMode]);

  const persistGrid = useCallback((items: MediaItem[]) => {
    localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify(items));
  }, []);

  useEffect(() => {
    localStorage.setItem(COLUMNS_STORAGE_KEY, String(columns));
  }, [columns]);

  useEffect(() => {
    localStorage.setItem(MIN_ROWS_STORAGE_KEY, String(minRows));
  }, [minRows]);

  const { openModal, closeModal } = useModalManager();

  const closeSearchResults = () => {
    logger.debug('Closing search results', {
      context: 'MediaSearch.closeSearchResults',
    });
    setSearchResults([]);
    setSearchResultAspectRatios({});
  };

  useEffect(() => {
    if (searchResults.length > 0) {
      openModal('searchResults');
    } else {
      closeModal('searchResults');
    }
  }, [searchResults.length, openModal, closeModal]);

  useModalClosed('searchResults', closeSearchResults);

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
          context: 'MediaSearch.runSearch',
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
          context: 'MediaSearch.runSearch',
          mediaType: activeMediaType,
          values: mergedValues,
          error: message,
        });
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [mergeSearchValues, resolveProvider, selectedMediaType],
  );

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const results = await runSearch(searchValues);
    if (selectedMediaType === 'custom' && results.length > 0) {
      handleAddMedia(results[0], results);
    }
  };

  const handleFieldChange = useCallback((fieldId: string, value: string) => {
    setSearchValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  }, []);

  const handleAddMedia = useCallback(
    (media: MediaItem, availableCovers?: MediaItem[]) => {
      const mediaWithCovers = { ...media };

      if (
        selectedMediaType === 'custom' &&
        searchValues.cover?.startsWith('img-')
      ) {
        mediaWithCovers.coverUrl = searchValues.cover;
        mediaWithCovers.coverThumbnailUrl = searchValues.cover;
      }

      const coversSource = availableCovers ?? searchResults;
      if (coversSource.length > 0) {
        const coverUrls = coversSource
          .map((result) => result.coverUrl || result.coverThumbnailUrl)
          .filter((url): url is string => Boolean(url));
        mediaWithCovers.alternateCoverUrls = coverUrls;
      }

      setGridItems((current) => {
        const updatedGrid = [...current, mediaWithCovers];
        persistGrid(updatedGrid);

        logger.info(
          `GRID: Added "${media.title}" to position ${current.length}`,
          {
            context: 'MediaSearch.handleAddMedia',
            action: 'grid_media_added',
            media: {
              id: media.id,
              title: media.title,
              year: media.year,
            },
            position: current.length,
            gridCount: updatedGrid.length,
            hasAlternateCovers: Boolean(
              mediaWithCovers.alternateCoverUrls?.length,
            ),
            timestamp: Date.now(),
          },
        );

        return updatedGrid;
      });
      setSearchResults([]);
      setSearchValues(provider.defaultSearchValues);
    },
    [
      provider.defaultSearchValues,
      searchResults,
      persistGrid,
      selectedMediaType,
      searchValues,
    ],
  );

  const handleRemoveMedia = useCallback(
    (mediaId: string | number) => {
      setGridItems((current) => {
        const mediaToRemove = current.find((m) => m.id === mediaId);
        const removedPosition = current.findIndex((m) => m.id === mediaId);
        const updatedGrid = current.filter((media) => media.id !== mediaId);
        persistGrid(updatedGrid);

        logger.info(
          `GRID: Removed "${mediaToRemove?.title || 'unknown'}" from position ${removedPosition}`,
          {
            context: 'MediaSearch.handleRemoveMedia',
            action: 'grid_media_removed',
            mediaId,
            position: removedPosition,
            gridCount: updatedGrid.length,
            timestamp: Date.now(),
          },
        );

        return updatedGrid;
      });
    },
    [persistGrid],
  );

  const fetchAlternateCovers = useCallback(
    async (
      mediaId: string | number,
      mediaType: MediaType,
      storedCovers?: string[],
    ) => {
      try {
        const service = getMediaService(mediaType);
        const covers = await service.getAlternateCovers(mediaId);
        if (covers.length > 0) {
          setAlternateCoverUrls(covers);
          return;
        }
      } catch (err) {
        logger.error('Failed to fetch alternate covers from API', {
          context: 'MediaSearch.fetchAlternateCovers',
          mediaId,
          mediaType,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      if (storedCovers && storedCovers.length > 0) {
        setAlternateCoverUrls(storedCovers);
      } else {
        setAlternateCoverUrls([]);
      }
    },
    [],
  );

  const handleClosePosterGrid = () => {
    logger.info('POSTER: Closing alternate poster grid', {
      context: 'MediaSearch.handleClosePosterGrid',
      action: 'poster_grid_close',
      timestamp: Date.now(),
    });
    setShowPosterGrid(false);
    setActivePosterItemId(null);
    setAlternateCoverUrls([]);
  };

  const handleSelectAlternatePoster = (url: string) => {
    if (!activePosterItemId) return;

    const updatedGrid = gridItems.map((item) =>
      item.id === activePosterItemId
        ? { ...item, coverUrl: url, coverThumbnailUrl: url }
        : item,
    );

    const updatedItem = updatedGrid.find(
      (item) => item.id === activePosterItemId,
    );

    logger.info('POSTER: Applied alternate cover', {
      context: 'MediaSearch.handleSelectAlternatePoster',
      action: 'poster_applied',
      media: updatedItem
        ? { id: updatedItem.id, title: updatedItem.title }
        : null,
      url,
    });

    setGridItems(updatedGrid);
    persistGrid(updatedGrid);
    setShowPosterGrid(false);
    setActivePosterItemId(null);
  };

  useEffect(() => {
    if (showPosterGrid) {
      openModal('posterGrid');
    } else {
      closeModal('posterGrid');
    }
  }, [showPosterGrid, openModal, closeModal]);

  useModalClosed('posterGrid', handleClosePosterGrid);

  const handleAspectRatioUpdate = useCallback(
    (mediaId: string | number, aspectRatio: number) => {
      setGridItems((current) => {
        const updated = current.map((item) =>
          item.id === mediaId ? { ...item, aspectRatio } : item,
        );
        persistGrid(updated);
        return updated;
      });
    },
    [persistGrid],
  );

  const handleCliSearch = async (query: string, mediaType?: string) => {
    if (!query) return;

    let activeMediaType = selectedMediaType;
    if (mediaType && mediaType !== selectedMediaType) {
      activeMediaType = mediaType as MediaType;
      setSelectedMediaType(mediaType as MediaType);
    }

    const targetProvider = getMediaProvider(activeMediaType);
    const primaryFieldId = targetProvider.searchFields[0]?.id ?? 'query';
    const nextValues = {
      ...targetProvider.defaultSearchValues,
      [primaryFieldId]: query,
    };
    setSearchValues(nextValues);
    await runSearch(nextValues);
  };

  const handleCliAddMedia = useCallback(
    (media: MediaItem) => {
      handleAddMedia(media);
      logger.info(`CLI-ADD: Added media "${media.title}"`, {
        context: 'MediaSearch.handleCliAddMedia',
        action: 'cli_add_media',
        media: { id: media.id, title: media.title },
      });
    },
    [handleAddMedia],
  );

  const handleCliRemoveMedia = useCallback(
    (id: string | number) => {
      handleRemoveMedia(id);
      logger.info(`CLI-REMOVE: Removed media with ID ${id}`, {
        context: 'MediaSearch.handleCliRemoveMedia',
        action: 'cli_remove_media',
        mediaId: id,
      });
    },
    [handleRemoveMedia],
  );

  const handleCliClearGrid = useCallback(() => {
    setGridItems([]);
    localStorage.removeItem(GRID_STORAGE_KEY);
    logger.info('CLI-CLEAR: Grid cleared via CLI command', {
      context: 'MediaSearch.handleCliClearGrid',
      action: 'cli_grid_cleared',
      timestamp: Date.now(),
    });
  }, []);

  const handleClearGrid = useCallback(() => {
    setGridItems([]);
    localStorage.removeItem(GRID_STORAGE_KEY);
    logger.info('CLEAR: Grid cleared via hamburger menu', {
      context: 'MediaSearch.handleClearGrid',
      action: 'grid_cleared_menu',
      timestamp: Date.now(),
    });
  }, []);

  const handleGetMenuState = useCallback(() => {
    const menuState: CliMenuState = {
      sections: [
        {
          name: 'Mode',
          options: [
            {
              name: isBuilderMode
                ? 'Switch to presentation mode'
                : 'Switch to builder mode',
              type: 'action',
              enabled: true,
              description:
                'Presentation hides builder UI for screenshots or display',
            },
          ],
        },
        {
          name: 'Grid Options',
          options: [
            {
              name: 'Clear Grid',
              type: 'action',
              enabled: gridItems.length > 0,
              description: 'Remove all items from grid and clear localStorage',
            },
          ],
        },
        {
          name: 'Layout Configuration',
          options: [
            {
              name: 'Adaptive Grid',
              type: 'feature',
              enabled: false,
              description: 'Dynamic grid sizing based on screen dimensions',
            },
          ],
        },
      ],
      currentGridCount: gridItems.length,
      maxGridCapacity: GRID_CAPACITY,
    };

    logger.info('MENU: State requested via CLI', {
      context: 'MediaSearch.handleGetMenuState',
      action: 'menu_state_requested',
      menuState,
      timestamp: Date.now(),
    });

    return menuState;
  }, [gridItems.length, isBuilderMode]);

  const handleMenuClearGrid = useCallback(() => {
    setGridItems([]);
    localStorage.removeItem(GRID_STORAGE_KEY);
    logger.info('CLI-MENU-CLEAR: Grid cleared via CLI menu command', {
      context: 'MediaSearch.handleMenuClearGrid',
      action: 'cli_menu_clear_grid',
      timestamp: Date.now(),
    });
  }, []);

  const handleGetDebugInfo = useCallback(() => {
    const debugInfo = window.gridDebugInfo ?? {
      error: 'No debug info available',
    };
    return debugInfo;
  }, []);

  const handleCliAddFirstResult = async (query: string) => {
    if (!query) return;
    const primaryFieldId = provider.searchFields[0]?.id ?? 'query';
    const nextValues = {
      ...provider.defaultSearchValues,
      ...searchValues,
      [primaryFieldId]: query,
    };
    setSearchValues(nextValues);
    const results = await runSearch(nextValues);
    if (results.length > 0) {
      handleAddMedia(results[0], results);
      logger.info(`CLI-ADD-FIRST: Added first result "${results[0].title}"`, {
        context: 'MediaSearch.handleCliAddFirstResult',
        action: 'cli_add_first_result',
        query,
        timestamp: Date.now(),
      });
    } else {
      logger.warn(`CLI-ADD-FIRST: No results found for query "${query}"`, {
        context: 'MediaSearch.handleCliAddFirstResult',
        query: query,
      });
    }
  };

  const handleCliGetGridState = useCallback(() => {
    const gridState = {
      count: gridItems.length,
      maxCapacity: GRID_CAPACITY,
      positions: gridItems.map((item, index) => ({
        position: index,
        matrixPosition: `(${Math.floor(index / 2)}, ${index % 2})`,
        media: {
          id: item.id,
          title: item.title,
          year: item.year,
        },
      })),
      emptyPositions: Array.from(
        { length: GRID_CAPACITY - gridItems.length },
        (_, i) => ({
          position: gridItems.length + i,
          matrixPosition: `(${Math.floor((gridItems.length + i) / 2)}, ${(gridItems.length + i) % 2})`,
        }),
      ),
    };

    logger.info(
      `CLI-GRID: Grid state requested - ${gridItems.length}/${GRID_CAPACITY} positions filled`,
      {
        context: 'MediaSearch.handleCliGetGridState',
        action: 'cli_grid_state',
        gridState,
        timestamp: Date.now(),
      },
    );

    return gridState;
  }, [gridItems]);

  useCliBridge({
    onSearch: handleCliSearch,
    onAddMedia: handleCliAddMedia,
    onRemoveMedia: handleCliRemoveMedia,
    onGetGridState: handleCliGetGridState,
    onClearGrid: handleCliClearGrid,
    onAddFirstResult: handleCliAddFirstResult,
    onGetMenuState: handleGetMenuState,
    onMenuClearGrid: handleMenuClearGrid,
    onGetDebugInfo: handleGetDebugInfo,
  });

  const searchSummary = lastSearchSummary || provider.label;

  const handleMediaTypeChange = (type: MediaType) => {
    setSelectedMediaType(type);
  };

  useEffect(() => {
    if (isBuilderMode) {
      searchInputRef.current?.focus();
    }
  }, [isBuilderMode]);

  const handleBuilderModeToggle = useCallback((enabled: boolean) => {
    setIsBuilderMode(enabled);
    logger.info(
      `MODE: Switched to ${enabled ? 'builder' : 'presentation'} mode`,
      {
        context: 'MediaSearch.handleBuilderModeToggle',
        action: 'mode_toggle',
        builderMode: enabled,
        timestamp: Date.now(),
      },
    );
  }, []);

  useEffect(() => {
    const windowWithTestApi = window as WindowWithTestApi;

    const testApi: TestApplicationApi = {
      setMediaType: (mediaType) => {
        setSelectedMediaType(mediaType);
        const defaults = mergeSearchValues({}, mediaType);
        setSearchValues(defaults);
        setSearchResults([]);
        setLastSearchSummary('');
      },
      search: (values, mediaType) =>
        runSearch(values ?? {}, mediaType ?? selectedMediaType),
      applySearchResults: (results, mediaType, summary) => {
        const targetMediaType = mediaType ?? selectedMediaType;
        const targetProvider = resolveProvider(targetMediaType);
        setSelectedMediaType(targetMediaType);
        setSearchValues(mergeSearchValues({}, targetMediaType));
        setSearchResults(results);
        setLastSearchSummary(
          summary ??
            formatSearchSummary(
              mergeSearchValues({}, targetMediaType),
              targetProvider.searchFields,
            ),
        );
        setIsLoading(false);
      },
      addMedia: (media, availableCovers) => {
        handleAddMedia(media, availableCovers);
      },
      removeMedia: (mediaId) => {
        handleRemoveMedia(mediaId);
      },
      clearGrid: handleClearGrid,
      getGridItems: () => gridItems.map((item) => ({ ...item })),
      getStoredGridItems: () => {
        const stored = localStorage.getItem(GRID_STORAGE_KEY);
        if (!stored) return [];
        try {
          const parsed = JSON.parse(stored) as MediaItem[];
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      },
      setBuilderMode: handleBuilderModeToggle,
      getBuilderMode: () => isBuilderMode,
      getSearchValues: () => searchValues,
    };

    windowWithTestApi.appTestApi = testApi;
    return () => {
      delete windowWithTestApi.appTestApi;
    };
  }, [
    gridItems,
    handleAddMedia,
    handleBuilderModeToggle,
    handleClearGrid,
    handleRemoveMedia,
    isBuilderMode,
    mergeSearchValues,
    resolveProvider,
    runSearch,
    searchValues,
    selectedMediaType,
  ]);

  const searchSectionClassName = `search-section ${isBuilderMode ? 'builder-mode' : 'presentation-mode'}`;
  const searchModuleClassName = `search-module ${isBuilderMode ? 'builder-mode' : 'presentation-mode'}`;

  return (
    <div className="container">
      <AppHeader
        onClearGrid={handleClearGrid}
        columns={columns}
        onColumnsChange={setColumns}
        minRows={minRows}
        onMinRowsChange={setMinRows}
        isBuilderMode={isBuilderMode}
        onBuilderModeToggle={handleBuilderModeToggle}
      />

      {isBuilderMode && (
        <MediaSearchForm
          mediaType={selectedMediaType}
          onMediaTypeChange={handleMediaTypeChange}
          searchValues={searchValues}
          onFieldChange={handleFieldChange}
          onSubmit={handleSearch}
          isLoading={isLoading}
          provider={provider}
          layout="band"
        />
      )}

      <div className={searchSectionClassName}>
        <div className="search-content">
          <div className={searchModuleClassName}>
            <Grid2x2
              items={gridItems}
              onRemoveMedia={handleRemoveMedia}
              onPosterClick={(item) => {
                logger.info(
                  `GRID: Opening alternate poster grid for "${item.title}"`,
                  {
                    context: 'MediaSearch.Grid2x2.onPosterClick',
                    action: 'poster_grid_open',
                    media: { id: item.id, title: item.title, type: item.type },
                    timestamp: Date.now(),
                  },
                );
                setActivePosterItemId(item.id);

                fetchAlternateCovers(
                  item.id,
                  item.type as MediaType,
                  item.alternateCoverUrls,
                );
                setShowPosterGrid(true);
              }}
              onPlaceholderClick={() => searchInputRef.current?.focus()}
              columns={columns}
              minRows={minRows}
              placeholderLabel={
                gridItems.length === 0 ? provider.resultLabel : undefined
              }
              isBuilderMode={isBuilderMode}
              onAspectRatioUpdate={handleAspectRatioUpdate}
            />
            {isBuilderMode && (
              <MediaSearchForm
                mediaType={selectedMediaType}
                onMediaTypeChange={handleMediaTypeChange}
                searchValues={searchValues}
                onFieldChange={handleFieldChange}
                onSubmit={handleSearch}
                isLoading={isLoading}
                provider={provider}
                layout="stack"
              />
            )}
          </div>
          {isLoading && <p>Loading...</p>}
          {error && <p className="error">{error}</p>}
          {showPosterGrid && (
            <div className="search-results poster-picker">
              <button
                type="button"
                className="search-close-button"
                onClick={handleClosePosterGrid}
                aria-label="Close alternate covers"
              >
                <MdClose aria-hidden="true" focusable="false" />
              </button>
              <h3 className="search-results-subtitle">
                Alternate covers
                {activePosterItem ? ` - ${activePosterItem.title}` : ''}
              </h3>
              <div className="poster-picker-grid">
                {alternateCoverUrls.length === 0 ? (
                  <div className="poster-picker-empty">No alternate covers</div>
                ) : (
                  alternateCoverUrls.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      className="poster-picker-card"
                      onClick={() => {
                        logger.info(
                          `POSTER: Selected alternate poster ${index + 1}`,
                          {
                            context: 'Grid2x2.onSelectAlternatePoster',
                            action: 'poster_change',
                            posterIndex: index + 1,
                            posterPath: url,
                            timestamp: Date.now(),
                          },
                        );
                        handleSelectAlternatePoster(url);
                      }}
                      aria-label={`Use alternate cover ${index + 1}`}
                    >
                      <img
                        src={url}
                        alt={`Alternate cover ${index + 1}`}
                        className="poster-picker-image"
                      />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
          {!showPosterGrid &&
            searchResults.length > 0 &&
            selectedMediaType !== 'custom' && (
              <div className="search-results">
                <button
                  type="button"
                  className="search-close-button"
                  onClick={closeSearchResults}
                  aria-label="Close search results"
                >
                  <MdClose aria-hidden="true" focusable="false" />
                </button>
                <h3 className="search-results-subtitle">
                  Results for: "
                  {searchSummary.length > 40
                    ? `${searchSummary.substring(0, 40)}...`
                    : searchSummary}
                  "
                </h3>
                <div className="search-results-grid">
                  {searchResults.map((result) => {
                    const imdbId =
                      typeof result.metadata?.imdb_id === 'string'
                        ? result.metadata.imdb_id
                        : undefined;
                    const externalLinks = getExternalLinks(
                      result,
                      selectedMediaType,
                      imdbId,
                    );

                    return (
                      <button
                        key={result.id}
                        type="button"
                        className="search-result-card"
                        data-media-id={result.id}
                        data-media-title={result.title}
                        onClick={() => handleAddMedia(result, searchResults)}
                        aria-label={`Add ${result.title}`}
                      >
                        {result.coverThumbnailUrl || result.coverUrl ? (
                          <img
                            src={
                              result.coverThumbnailUrl || result.coverUrl || ''
                            }
                            alt={`${result.title} cover`}
                            className="search-result-poster-large"
                            onLoad={(e) =>
                              handleSearchResultImageLoad(result.id, e)
                            }
                            style={
                              searchResultAspectRatios[result.id]
                                ? {
                                    aspectRatio:
                                      searchResultAspectRatios[result.id],
                                  }
                                : undefined
                            }
                          />
                        ) : (
                          <div className="search-result-placeholder large">
                            No cover
                          </div>
                        )}
                        <div className="search-result-meta">
                          <div className="search-result-title">
                            <span className="search-result-name">
                              {result.title}
                            </span>
                            {result.subtitle && (
                              <span className="search-result-subtitle">
                                {result.subtitle}
                              </span>
                            )}
                          </div>
                          {result.year && (
                            <span className="search-result-year">
                              {result.year}
                            </span>
                          )}
                        </div>
                        {externalLinks.length > 0 && (
                          <div className="search-result-badges">
                            {externalLinks.map((link) => (
                              <a
                                key={link.href}
                                href={link.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="search-badge"
                                aria-label={link.label}
                                onClick={(event) => event.stopPropagation()}
                              >
                                <img
                                  src={`https://www.google.com/s2/favicons?sz=32&domain=${link.domain}`}
                                  alt=""
                                  aria-hidden="true"
                                />
                                <span>{link.label}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default MediaSearch;
