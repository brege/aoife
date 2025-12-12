import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MdDriveFolderUpload } from 'react-icons/md';
import '../../app/styles/global.css';
import './search.css';
import { type CliMenuState, useCliBridge } from '../../lib/api';
import useEscapeKey from '../../lib/escape';
import logger from '../../lib/logger';
import { getMediaService } from '../../media/factory';
import { getMediaProvider } from '../../media/providers';
import { storeImage } from '../../lib/indexeddb';
import type {
  MediaItem,
  MediaSearchValues,
  MediaType,
} from '../../media/types';
import Grid2x2 from '../grid/grid';
import CloseIcon from '../ui/close';
import AppHeader from '../ui/header';
import Dropdown from './dropdown';
import { PlatformAutocomplete } from './platformautocomplete';

const GRID_STORAGE_KEY = 'gridItems';
const COLUMNS_STORAGE_KEY = 'gridColumns';
const MIN_ROWS_STORAGE_KEY = 'gridMinRows';
const GRID_CAPACITY = 4;

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

  const closeSearchResults = () => {
    logger.debug('Closing search results', {
      context: 'MediaSearch.closeSearchResults',
    });
    setSearchResults([]);
    setSearchResultAspectRatios({});
  };
  useEscapeKey(closeSearchResults);

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
    async (values: MediaSearchValues) => {
      setIsLoading(true);
      setError('');

      try {
        const service = getMediaService(selectedMediaType);
        const results = await service.search(values);

        logger.info(`SEARCH: Found ${results.length} results`, {
          context: 'MediaSearch.runSearch',
          action: 'search_results',
          mediaType: selectedMediaType,
          values,
          resultsCount: results.length,
          timestamp: Date.now(),
        });

        setSearchResults(results);
        setLastSearchSummary(
          formatSearchSummary(values, provider.searchFields),
        );
        return results;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const friendly = message.includes('not yet implemented')
          ? `${provider.label} search is not configured yet. Wire up its cover API to enable it.`
          : 'An error occurred while searching.';

        setError(friendly);
        setSearchResults([]);

        logger.error('Search request failed', {
          context: 'MediaSearch.runSearch',
          mediaType: selectedMediaType,
          values,
          error: message,
        });
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [selectedMediaType, provider],
  );

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const results = await runSearch(searchValues);
    if (selectedMediaType === 'custom' && results.length > 0) {
      handleAddMedia(results[0], results);
    }
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setSearchValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleCoverImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const imageId = `img-${Date.now()}-${file.name}`;
        await storeImage(imageId, file);
        handleFieldChange('cover', imageId);
        if (!searchValues.query) {
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          handleFieldChange('query', nameWithoutExt);
        }
      }
    },
    [searchValues.query],
  );

  const handleAddMedia = useCallback(
    (media: MediaItem, availableCovers?: MediaItem[]) => {
      let mediaWithCovers = { ...media };

      if (selectedMediaType === 'custom' && searchValues.cover?.startsWith('img-')) {
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

      const updatedGrid = [...gridItems, mediaWithCovers];
      setGridItems(updatedGrid);
      setSearchResults([]);
      setSearchValues(provider.defaultSearchValues);
      persistGrid(updatedGrid);

      logger.info(
        `GRID: Added "${media.title}" to position ${gridItems.length}`,
        {
          context: 'MediaSearch.handleAddMedia',
          action: 'grid_media_added',
          media: {
            id: media.id,
            title: media.title,
            year: media.year,
          },
          position: gridItems.length,
          gridCount: updatedGrid.length,
          hasAlternateCovers: Boolean(
            mediaWithCovers.alternateCoverUrls?.length,
          ),
          timestamp: Date.now(),
        },
      );
    },
    [gridItems, provider.defaultSearchValues, searchResults, persistGrid, selectedMediaType, searchValues],
  );

  const handleRemoveMedia = useCallback(
    (mediaId: string | number) => {
      const mediaToRemove = gridItems.find((m) => m.id === mediaId);
      const removedPosition = gridItems.findIndex((m) => m.id === mediaId);

      const updatedGrid = gridItems.filter((media) => media.id !== mediaId);
      setGridItems(updatedGrid);
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
    },
    [gridItems, persistGrid],
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
              showPosterGrid={showPosterGrid}
              alternatePosterUrls={alternateCoverUrls}
              onSelectAlternatePoster={handleSelectAlternatePoster}
              onClosePosterGrid={handleClosePosterGrid}
              onPlaceholderClick={() => searchInputRef.current?.focus()}
              columns={columns}
              minRows={minRows}
              placeholderLabel={provider.resultLabel}
              isBuilderMode={isBuilderMode}
              onAspectRatioUpdate={handleAspectRatioUpdate}
            />
            {isBuilderMode && (
              <form onSubmit={handleSearch} className="search-form">
                <Dropdown
                  value={selectedMediaType}
                  onChange={handleMediaTypeChange}
                />
                {provider.searchFields.map((field, index) => {
                  if (field.id === 'platform' && selectedMediaType === 'games') {
                    return (
                      <PlatformAutocomplete
                        key={field.id}
                        value={searchValues[field.id] ?? ''}
                        onChange={(value) =>
                          handleFieldChange(field.id, value)
                        }
                        placeholder={field.placeholder}
                        ariaLabel={field.label}
                      />
                    );
                  }

                  if (field.id === 'cover' && selectedMediaType === 'custom') {
                    return (
                      <div key={field.id} className="input-with-button">
                        <input
                          ref={index === 0 ? searchInputRef : undefined}
                          type="text"
                          value={searchValues[field.id] ?? ''}
                          onChange={(e) =>
                            handleFieldChange(field.id, e.target.value)
                          }
                          placeholder={field.placeholder}
                          aria-label={field.label}
                          className="search-input"
                          required={field.required}
                        />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverImageUpload}
                          style={{ display: 'none' }}
                          id="cover-file-input"
                          aria-label="Upload cover image"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            document.getElementById('cover-file-input')?.click()
                          }
                          className="icon-button"
                          aria-label="Upload image"
                          title="Upload image"
                        >
                          <MdDriveFolderUpload size={20} />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <input
                      key={field.id}
                      ref={index === 0 ? searchInputRef : undefined}
                      type="text"
                      value={searchValues[field.id] ?? ''}
                      onChange={(e) =>
                        handleFieldChange(field.id, e.target.value)
                      }
                      placeholder={field.placeholder}
                      aria-label={field.label}
                      className="search-input"
                      required={field.required}
                    />
                  );
                })}
                <div className="search-buttons-row">
                  <button
                    type="submit"
                    className="search-button"
                    disabled={isLoading}
                    onClick={() => {
                      const action = selectedMediaType === 'custom' ? 'Upload' : 'Search';
                      logger.info(
                        `${action}: ${formatSearchSummary(searchValues, provider.searchFields)}`,
                        {
                          context: 'MediaSearch.SearchButton',
                          action: selectedMediaType === 'custom' ? 'custom_upload' : 'search_submit',
                          values: searchValues,
                          timestamp: Date.now(),
                        },
                      );
                    }}
                  >
                    {selectedMediaType === 'custom'
                      ? isLoading
                        ? 'Uploading...'
                        : 'Upload'
                      : isLoading
                        ? 'Searching...'
                        : 'Search'}
                  </button>
                </div>
              </form>
            )}
          </div>
          {isLoading && <p>Loading...</p>}
          {error && <p className="error">{error}</p>}
          {searchResults.length > 0 && selectedMediaType !== 'custom' && (
            <div className="search-results">
              <button
                type="button"
                className="close-button"
                onClick={closeSearchResults}
              >
                <CloseIcon />
              </button>
              <h3 className="search-results-subtitle">
                Results for: "
                {searchSummary.length > 40
                  ? `${searchSummary.substring(0, 40)}...`
                  : searchSummary}
                "
              </h3>
              {searchResults.map((result) => {
                const imdbId =
                  typeof result.metadata?.imdb_id === 'string'
                    ? result.metadata.imdb_id
                    : undefined;

                return (
                  <div key={result.id} className="movie-item">
                    {result.coverThumbnailUrl || result.coverUrl ? (
                      <img
                        src={result.coverThumbnailUrl || result.coverUrl || ''}
                        alt={`${result.title} cover`}
                        className="search-result-poster"
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
                      <div className="search-result-placeholder">+</div>
                    )}
                    <div className="movie-item-info">
                      <span className="movie-title">
                        {`${result.title}${
                          result.year ? ` (${result.year})` : ''
                        }`}
                      </span>
                      {(selectedMediaType === 'movies' ||
                        selectedMediaType === 'tv') && (
                        <div className="movie-details">
                          <a
                            href={`https://www.themoviedb.org/${selectedMediaType === 'tv' ? 'tv' : 'movie'}/${result.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tmdb-link"
                          >
                            [tmdb]
                          </a>
                          {selectedMediaType === 'movies' && (
                            <a
                              href={`https://letterboxd.com/tmdb/${result.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="tmdb-link"
                            >
                              [letterboxd]
                            </a>
                          )}
                          {imdbId && (
                            <a
                              href={`https://www.imdb.com/title/${imdbId}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="tmdb-link"
                            >
                              [imdb]
                            </a>
                          )}
                        </div>
                      )}
                      {selectedMediaType === 'books' && (
                        <div className="movie-details">
                          {result.source === 'OpenLibrary' &&
                            typeof result.metadata?.openLibraryKey ===
                              'string' && (
                              <a
                                href={`https://openlibrary.org${result.metadata.openLibraryKey}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="tmdb-link"
                              >
                                [openlibrary]
                              </a>
                            )}
                          {result.source === 'GoogleBooks' &&
                            typeof result.metadata?.volumeId === 'string' && (
                              <a
                                href={`https://books.google.com/books?id=${result.metadata.volumeId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="tmdb-link"
                              >
                                [googlebooks]
                              </a>
                            )}
                        </div>
                      )}
                      {selectedMediaType === 'music' &&
                        typeof result.metadata?.mbid === 'string' && (
                          <div className="movie-details">
                            <a
                              href={`https://musicbrainz.org/release/${result.metadata.mbid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="tmdb-link"
                            >
                              [musicbrainz]
                            </a>
                          </div>
                        )}
                    </div>
                    <button
                      type="button"
                      className="add-button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddMedia(result, searchResults);
                      }}
                    >
                      Add
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaSearch;
