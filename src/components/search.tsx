import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../global.css';
import './search.css';
import { type CliMenuState, useCliBridge } from '../cli';
import useEscapeKey from '../escape';
import logger from '../logger';
import { getMediaService } from '../media/factory';
import { getMediaProvider } from '../media/providers';
import type { MediaItem, MediaSearchValues, MediaType } from '../media/types';
import CloseIcon from './close';
import CustomMediaForm from './form';
import Grid2x2, { type GridLayoutMode } from './grid';
import AppHeader from './header';

const GRID_STORAGE_KEY = 'gridItems';
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
  const [gridItems, setGridItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [alternateCoverUrls, setAlternateCoverUrls] = useState<string[]>([]);
  const [showPosterGrid, setShowPosterGrid] = useState(false);
  const [activePosterItemId, setActivePosterItemId] = useState<
    string | number | null
  >(null);
  const [gridLayoutMode, setGridLayoutMode] = useState<GridLayoutMode>('auto');
  const [fitToScreen, setFitToScreen] = useState<boolean>(true);
  const [showCustomMediaForm, setShowCustomMediaForm] = useState(false);
  const [lastSearchSummary, setLastSearchSummary] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

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
  }, [provider]);

  const persistGrid = useCallback((items: MediaItem[]) => {
    localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify(items));
  }, []);

  const closeSearchResults = () => {
    logger.debug('Closing search results', {
      context: 'MediaSearch.closeSearchResults',
    });
    setSearchResults([]);
  };
  useEscapeKey(closeSearchResults);

  const closeCustomMediaForm = useCallback(() => {
    setShowCustomMediaForm(false);
  }, []);
  useEscapeKey(closeCustomMediaForm);

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
    await runSearch(searchValues);
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setSearchValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleAddMedia = useCallback(
    (media: MediaItem) => {
      if (gridItems.length >= GRID_CAPACITY) {
        logger.warn('Cannot add media: grid is full (4/4)', {
          context: 'MediaSearch.handleAddMedia',
          action: 'add_rejected_full_grid',
        });
        return;
      }

      const updatedGrid = [...gridItems, media];
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
          timestamp: Date.now(),
        },
      );
    },
    [gridItems, provider.defaultSearchValues, persistGrid],
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
    async (mediaId: string | number) => {
      if (!provider.supportsAlternateCovers) {
        setAlternateCoverUrls([]);
        return;
      }

      try {
        const service = getMediaService(selectedMediaType);
        const covers = await service.getAlternateCovers(mediaId);
        setAlternateCoverUrls(covers);
      } catch (err) {
        setAlternateCoverUrls([]);
        logger.error('Failed to fetch alternate covers', {
          context: 'MediaSearch.fetchAlternateCovers',
          mediaId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [provider.supportsAlternateCovers, selectedMediaType],
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

  const handleAddCustomMedia = (media: {
    title: string;
    year: string;
    coverUrl: string;
  }) => {
    const parsedYear = media.year ? parseInt(media.year, 10) : undefined;
    const newMedia: MediaItem = {
      id: Date.now(),
      type: selectedMediaType,
      title: media.title,
      subtitle: media.year,
      year: Number.isNaN(parsedYear) ? undefined : parsedYear,
      coverUrl: media.coverUrl,
      coverThumbnailUrl: media.coverUrl,
      customEntry: true,
      metadata: {
        year: media.year,
      },
    };

    handleAddMedia(newMedia);
    setShowCustomMediaForm(false);
  };

  const handleCliSearch = async (query: string) => {
    if (!query) return;
    const primaryFieldId = provider.searchFields[0]?.id ?? 'query';
    const nextValues = {
      ...provider.defaultSearchValues,
      ...searchValues,
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
  }, [gridItems.length]);

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

  const handleCustomFormOverlayClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        closeCustomMediaForm();
      }
    },
    [closeCustomMediaForm],
  );

  const handleCustomFormOverlayKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCustomMediaForm();
      }
    },
    [closeCustomMediaForm],
  );

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
      handleAddMedia(results[0]);
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

  return (
    <div className="container">
      <AppHeader
        selectedMediaType={selectedMediaType}
        onMediaTypeChange={setSelectedMediaType}
        onClearGrid={handleClearGrid}
        gridLayoutMode={gridLayoutMode}
        onGridLayoutModeChange={setGridLayoutMode}
        fitToScreen={fitToScreen}
        onFitToScreenChange={setFitToScreen}
      />

      <div className="search-section">
        <div className="search-content">
          <div className="search-module">
            <Grid2x2
              items={gridItems}
              onRemoveMedia={handleRemoveMedia}
              onPosterClick={(item) => {
                if (!provider.supportsAlternateCovers) {
                  return;
                }
                logger.info(
                  `GRID: Opening alternate poster grid for "${item.title}"`,
                  {
                    context: 'MediaSearch.Grid2x2.onPosterClick',
                    action: 'poster_grid_open',
                    media: { id: item.id, title: item.title },
                    timestamp: Date.now(),
                  },
                );
                setActivePosterItemId(item.id);
                fetchAlternateCovers(item.id);
                setShowPosterGrid(true);
              }}
              showPosterGrid={showPosterGrid}
              alternatePosterUrls={alternateCoverUrls}
              onSelectAlternatePoster={handleSelectAlternatePoster}
              onClosePosterGrid={handleClosePosterGrid}
              onPlaceholderClick={() => searchInputRef.current?.focus()}
              layoutMode={gridLayoutMode}
              fitToScreen={fitToScreen}
              placeholderLabel={provider.resultLabel}
            />
            <form onSubmit={handleSearch} className="search-form">
              {provider.searchFields.map((field, index) => (
                <input
                  key={field.id}
                  ref={index === 0 ? searchInputRef : undefined}
                  type="text"
                  value={searchValues[field.id] ?? ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className="search-input"
                  required={field.required}
                />
              ))}
              <button
                type="submit"
                className="search-button"
                disabled={isLoading}
                onClick={() => {
                  logger.info(
                    `SEARCH: Searching for "${formatSearchSummary(searchValues, provider.searchFields)}"`,
                    {
                      context: 'MediaSearch.SearchButton',
                      action: 'search_submit',
                      values: searchValues,
                      timestamp: Date.now(),
                    },
                  );
                }}
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </form>
          </div>
          {isLoading && <p>Loading...</p>}
          {error && <p className="error">{error}</p>}
          {searchResults.length > 0 && (
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
                      {selectedMediaType === 'movies' && (
                        <div className="movie-details">
                          <a
                            href={`https://www.themoviedb.org/movie/${result.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tmdb-link"
                          >
                            [tmdb]
                          </a>
                          <a
                            href={`https://letterboxd.com/tmdb/${result.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tmdb-link"
                          >
                            [letterboxd]
                          </a>
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
                    </div>
                    <button
                      type="button"
                      className="add-button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddMedia(result);
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
        {gridItems.length < GRID_CAPACITY && !searchResults.length && (
          <button
            type="button"
            onClick={() => setShowCustomMediaForm(true)}
            className="add-custom-button"
          >
            {`Add Custom ${provider.resultLabel.charAt(0).toUpperCase() + provider.resultLabel.slice(1)}`}
          </button>
        )}
      </div>

      {showCustomMediaForm && (
        <div
          className="custom-form-overlay"
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          aria-label="Custom media form"
          onClick={handleCustomFormOverlayClick}
          onKeyDown={handleCustomFormOverlayKeyDown}
        >
          <div className="custom-form-container">
            <CustomMediaForm
              mediaType={selectedMediaType}
              onAddCustomMedia={handleAddCustomMedia}
              onCancel={closeCustomMediaForm}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaSearch;
