import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import '../../app/styles/global.css';
import './search.css';
import { useGridOperations } from '../../lib/grid-operations';
import logger from '../../lib/logger';
import { useModalClosed, useModalManager } from '../../lib/modalmanager';
import { useLayoutState } from '../../lib/state/layout';
import { useSearchState } from '../../lib/state/search';
import { useShareState } from '../../lib/state/share';
import { DEFAULT_TITLE, TITLE_STORAGE_KEY } from '../../lib/state/storage';
import type { MediaItem, MediaType } from '../../media/types';
import Grid from '../grid/grid';
import AppHeader from '../ui/header';
import { useSearchBridges } from './bridge';
import { MediaForm } from './mediaform';
import { PosterPicker } from './picker';
import { SearchResults } from './results';

const normalizeTitle = (value: string): string => {
  const trimmed = value.trim();
  return trimmed === '' ? DEFAULT_TITLE : trimmed;
};

const MediaSearch: React.FC = () => {
  useEffect(() => {
    logger.setDebugMode(true);
    logger.info('MediaSearch component initialized', {
      context: 'MediaSearch',
    });
  }, []);

  const [isBuilderMode, setIsBuilderMode] = useState(true);

  const {
    selectedMediaType,
    searchValues,
    searchResults,
    searchResultAspectRatios,
    lastSearchSummary,
    isLoading: searchIsLoading,
    error: searchError,
    setSelectedMediaType,
    runSearch,
    handleFieldChange,
    handleSearchResultImageLoad,
    closeSearchResults,
    provider,
    setSearchResults,
    setSearchValues,
  } = useSearchState({ isBuilderMode });

  const [isIndexedDbHydrated, setIsIndexedDbHydrated] = useState(false);

  const {
    columns,
    setColumns,
    minRows,
    setMinRows,
    layoutDimension,
    setLayoutDimension,
    coverViewMode,
    setCoverViewMode,
  } = useLayoutState({ isHydrated: isIndexedDbHydrated });

  const [gridItems, setGridItems] = useState<MediaItem[]>([]);
  const [title, setTitle] = useState<string>(() => {
    const stored = localStorage.getItem(TITLE_STORAGE_KEY);
    return stored ? normalizeTitle(stored) : DEFAULT_TITLE;
  });
  const [alternateCoverUrls, setAlternateCoverUrls] = useState<string[]>([]);
  const [showPosterGrid, setShowPosterGrid] = useState(false);
  const [activePosterItemId, setActivePosterItemId] = useState<
    string | number | null
  >(null);
  const activePosterItem = useMemo(
    () => gridItems.find((item) => item.id === activePosterItemId) ?? null,
    [gridItems, activePosterItemId],
  );
  const {
    shareUrl,
    shareError,
    isSharing,
    isLoadingShare,
    handleCreateShare,
    resetShareContext,
  } = useShareState({
    columns,
    minRows,
    layoutDimension,
    gridItems,
    title,
    isHydrated: isIndexedDbHydrated,
    setColumns,
    setMinRows,
    setLayoutDimension,
    setGridItems,
    setTitle,
    setIsHydrated: setIsIndexedDbHydrated,
  });

  const {
    handleAddMedia,
    handleRemoveMedia,
    handleAspectRatioUpdate,
    handleSelectAlternatePoster,
    handleClosePosterGrid,
    fetchAlternateCovers,
    clearGrid,
  } = useGridOperations(
    {
      selectedMediaType,
      searchValues,
      searchResults,
      provider,
      gridItems,
      activePosterItemId,
    },
    {
      setGridItems,
      setSearchResults,
      setSearchValues,
      setAlternateCoverUrls,
      setShowPosterGrid,
      setActivePosterItemId,
    },
  );

  const { openModal, closeModal } = useModalManager();

  useEffect(() => {
    if (searchResults.length > 0) {
      openModal('searchResults');
    } else {
      closeModal('searchResults');
    }
  }, [searchResults.length, openModal, closeModal]);

  useModalClosed('searchResults', closeSearchResults);

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const results = await runSearch(searchValues);
      if (selectedMediaType === 'custom' && results.length > 0) {
        handleAddMedia(results[0], results);
      }
    },
    [runSearch, searchValues, selectedMediaType, handleAddMedia],
  );

  const handleTitleChange = useCallback((nextTitle: string) => {
    setTitle(normalizeTitle(nextTitle));
  }, []);

  const clearGridAndPersist = useCallback(
    (source: string) => {
      clearGrid();
      resetShareContext();
      logger.info(source, {
        context: 'MediaSearch.clearGridAndPersist',
        action: 'grid_cleared',
        timestamp: Date.now(),
      });
    },
    [clearGrid, resetShareContext],
  );

  useEffect(() => {
    if (showPosterGrid) {
      openModal('posterGrid');
    } else {
      closeModal('posterGrid');
    }
  }, [showPosterGrid, openModal, closeModal]);

  useModalClosed('posterGrid', handleClosePosterGrid);

  const searchSummary = lastSearchSummary || provider.label;

  const handleMediaTypeChange = (type: MediaType) => {
    setSelectedMediaType(type);
  };

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

  const handleClearGrid = useCallback(() => {
    clearGridAndPersist('CLEAR: Grid cleared via hamburger menu');
  }, [clearGridAndPersist]);

  const gridCapacity = columns * minRows;

  useSearchBridges({
    gridItems,
    gridCapacity,
    columns,
    isBuilderMode,
    searchValues,
    provider,
    selectedMediaType,
    layoutDimension,
    runSearch,
    setSelectedMediaType,
    setLayoutDimension,
    handleAddMedia,
    handleRemoveMedia,
    clearGridAndPersist,
    handleBuilderModeToggle,
    handleClearGrid,
  });

  const searchSectionClassName = `search-section ${isBuilderMode ? 'builder-mode' : 'presentation-mode'}`;
  const searchModuleClassName = `search-module ${isBuilderMode ? 'builder-mode' : 'presentation-mode'}`;

  return (
    <div className="container">
      <AppHeader
        title={title}
        onTitleChange={handleTitleChange}
        onClearGrid={handleClearGrid}
        columns={columns}
        onColumnsChange={setColumns}
        minRows={minRows}
        onMinRowsChange={setMinRows}
        isBuilderMode={isBuilderMode}
        onBuilderModeToggle={handleBuilderModeToggle}
        layoutDimension={layoutDimension}
        onLayoutDimensionChange={setLayoutDimension}
        onShare={handleCreateShare}
        isSharing={isSharing}
        shareUrl={shareUrl}
        shareError={shareError}
        isLoadingShare={isLoadingShare}
        coverViewMode={coverViewMode}
        onCoverViewModeChange={setCoverViewMode}
      />

      {isBuilderMode && (
        <MediaForm
          mediaType={selectedMediaType}
          onMediaTypeChange={handleMediaTypeChange}
          searchValues={searchValues}
          onFieldChange={handleFieldChange}
          onSubmit={handleFormSubmit}
          isLoading={searchIsLoading}
          provider={provider}
          layout="band"
        />
      )}

      <div className={searchSectionClassName}>
        <div className="search-content">
          <div className={searchModuleClassName}>
            <Grid
              items={gridItems}
              onRemoveMedia={handleRemoveMedia}
              onPosterClick={(item) => {
                logger.info(
                  `GRID: Opening alternate poster grid for "${item.title}"`,
                  {
                    context: 'MediaSearch.Grid.onPosterClick',
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
              columns={columns}
              minRows={minRows}
              placeholderLabel={
                gridItems.length === 0 ? provider.resultLabel : undefined
              }
              onAspectRatioUpdate={handleAspectRatioUpdate}
              layoutDimension={layoutDimension}
            />
            {isBuilderMode && (
              <MediaForm
                mediaType={selectedMediaType}
                onMediaTypeChange={handleMediaTypeChange}
                searchValues={searchValues}
                onFieldChange={handleFieldChange}
                onSubmit={handleFormSubmit}
                isLoading={searchIsLoading}
                provider={provider}
                layout="stack"
              />
            )}
          </div>
          {searchIsLoading && <p>Loading...</p>}
          {searchError && <p className="error">{searchError}</p>}
          {showPosterGrid && activePosterItem && (
            <PosterPicker
              coverViewMode={coverViewMode}
              urls={alternateCoverUrls}
              mediaTitle={activePosterItem.title}
              onClose={handleClosePosterGrid}
              onSelectCarouselCover={(url) => {
                logger.info(`POSTER: Selected alternate poster from carousel`, {
                  context: 'Carousel',
                  action: 'poster_change',
                  posterPath: url,
                  timestamp: Date.now(),
                });
                handleSelectAlternatePoster(url);
              }}
              onSelectGridCover={(url, index) => {
                logger.info(`POSTER: Selected alternate poster ${index + 1}`, {
                  context: 'Grid.onSelectAlternatePoster',
                  action: 'poster_change',
                  posterIndex: index + 1,
                  posterPath: url,
                  timestamp: Date.now(),
                });
                handleSelectAlternatePoster(url);
              }}
            />
          )}
          {!showPosterGrid &&
            searchResults.length > 0 &&
            selectedMediaType !== 'custom' && (
              <SearchResults
                results={searchResults}
                mediaType={selectedMediaType}
                searchSummary={searchSummary}
                aspectRatios={searchResultAspectRatios}
                onClose={closeSearchResults}
                onAdd={handleAddMedia}
                onPosterLoad={handleSearchResultImageLoad}
              />
            )}
        </div>
      </div>
    </div>
  );
};

export default MediaSearch;
