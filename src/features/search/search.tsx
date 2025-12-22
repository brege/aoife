import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import '../../app/styles/global.css';
import './search.css';
import { useGridOperations } from '../../lib/grid-operations';
import logger from '../../lib/logger';
import { useModalClosed, useModalManager } from '../../lib/modalmanager';
import { useLayoutState } from '../../lib/state/layout';
import { useSearchState } from './state';
import { useShareState } from '../../lib/state/share';
import { DEFAULT_TITLE, TITLE_STORAGE_KEY } from '../../lib/state/storage';
import type { MediaItem, MediaType } from '../../media/types';
import { CaptionModal } from './modals/caption';
import Grid from '../grid/grid';
import AppHeader from '../../ui/header';
import { useSearchBridges } from './bridge';
import { CoverLinkModal } from './modals/cover';
import { MediaForm } from './form/form';
import { PosterPicker } from './picker/picker';
import { SearchResults } from './results/results';

const normalizeTitle = (value: string): string => {
  const trimmed = value.trim();
  return trimmed === '' ? DEFAULT_TITLE : trimmed;
};

const getEmptyStateLabel = (mediaType: MediaType): string => {
  switch (mediaType) {
    case 'music':
      return 'add an album cover';
    case 'movies':
    case 'tv':
      return 'add a poster';
    case 'books':
      return 'add a book cover';
    case 'games':
      return 'add box art';
    case 'custom':
      return 'add an image';
    default:
      return 'add a cover';
  }
};

const MediaSearch: React.FC = () => {
  useEffect(() => {
    logger.setDebugMode(true);
    logger.info('MediaSearch component initialized', {
      context: 'MediaSearch',
    });
  }, []);

  const [showSearch, setShowSearch] = useState(true);
  const visibleResultsStep = 12;
  const [visibleResultsCount, setVisibleResultsCount] =
    useState(visibleResultsStep);

  const {
    selectedMediaType,
    searchValues,
    searchResults,
    brokenSearchResultIds,
    searchResultAspectRatios,
    lastSearchSummary,
    isLoading: searchIsLoading,
    error: searchError,
    setSelectedMediaType,
    runSearch,
    handleFieldChange,
    handleSearchResultImageLoad,
    handleSearchResultImageError,
    closeSearchResults,
    provider,
    setSearchResults,
    setSearchValues,
  } = useSearchState({ showSearch });

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
    bandPlacementMode,
    setBandPlacementMode,
    captionMode,
    setCaptionMode,
    captionEditsOnly,
    setCaptionEditsOnly,
  } = useLayoutState({ isHydrated: isIndexedDbHydrated });

  const [gridItems, setGridItems] = useState<MediaItem[]>([]);
  const [title, setTitle] = useState<string>(() => {
    const stored = localStorage.getItem(TITLE_STORAGE_KEY);
    return stored ? normalizeTitle(stored) : DEFAULT_TITLE;
  });
  const [alternateCoverUrls, setAlternateCoverUrls] = useState<string[]>([]);
  const [brokenAlternateCoverUrls, setBrokenAlternateCoverUrls] = useState<
    Record<string, true>
  >({});
  const [showPosterGrid, setShowPosterGrid] = useState(false);
  const [showCoverLinkModal, setShowCoverLinkModal] = useState(false);
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [coverLinkMediaType, setCoverLinkMediaType] =
    useState<MediaType>('books');
  const [activePosterItemId, setActivePosterItemId] = useState<
    string | number | null
  >(null);
  const [activeCaptionItemId, setActiveCaptionItemId] = useState<
    string | number | null
  >(null);
  const activePosterItem = useMemo(
    () => gridItems.find((item) => item.id === activePosterItemId) ?? null,
    [gridItems, activePosterItemId],
  );
  const activeCaptionItem = useMemo(
    () => gridItems.find((item) => item.id === activeCaptionItemId) ?? null,
    [gridItems, activeCaptionItemId],
  );
  const visibleAlternateCoverUrls = useMemo(
    () =>
      alternateCoverUrls.filter(
        (url) => !Object.hasOwn(brokenAlternateCoverUrls, url),
      ),
    [alternateCoverUrls, brokenAlternateCoverUrls],
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

  useEffect(() => {
    setVisibleResultsCount(Math.min(searchResults.length, visibleResultsStep));
  }, [searchResults]);

  useModalClosed('searchResults', closeSearchResults);

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const results = await runSearch(searchValues);
      const hasDirectCover =
        (selectedMediaType === 'books' || selectedMediaType === 'music') &&
        Boolean(searchValues.coverUrl?.trim());
      if (
        (selectedMediaType === 'custom' || hasDirectCover) &&
        results.length > 0
      ) {
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
      setSelectedMediaType('movies');
      resetShareContext();
      logger.info(source, {
        context: 'MediaSearch.clearGridAndPersist',
        action: 'grid_cleared',
        timestamp: Date.now(),
      });
    },
    [clearGrid, resetShareContext, setSelectedMediaType],
  );

  useEffect(() => {
    if (showPosterGrid) {
      openModal('posterGrid');
    } else {
      closeModal('posterGrid');
    }
  }, [showPosterGrid, openModal, closeModal]);

  useModalClosed('posterGrid', handleClosePosterGrid);

  useEffect(() => {
    if (showCoverLinkModal) {
      openModal('coverLink');
    } else {
      closeModal('coverLink');
    }
  }, [showCoverLinkModal, openModal, closeModal]);

  useModalClosed('coverLink', () => setShowCoverLinkModal(false));

  useEffect(() => {
    if (showCaptionModal) {
      openModal('caption');
    } else {
      closeModal('caption');
    }
  }, [showCaptionModal, openModal, closeModal]);

  const closeCaptionModal = useCallback(() => {
    setShowCaptionModal(false);
    setActiveCaptionItemId(null);
  }, []);

  useModalClosed('caption', closeCaptionModal);

  const searchSummary = lastSearchSummary || provider.label;
  const bandPlacement =
    bandPlacementMode === 'adaptive' && gridItems.length > 0 ? 'bottom' : 'top';

  const handleMediaTypeChange = (type: MediaType) => {
    setSelectedMediaType(type);
  };

  const handleShowSearchToggle = useCallback((enabled: boolean) => {
    setShowSearch(enabled);
    logger.info(`SEARCH: ${enabled ? 'Showing' : 'Hiding'} search`, {
      context: 'MediaSearch.handleShowSearchToggle',
      action: 'search_toggle',
      showSearch: enabled,
      timestamp: Date.now(),
    });
  }, []);

  const handleClearGrid = useCallback(() => {
    clearGridAndPersist('CLEAR: Grid cleared via hamburger menu');
  }, [clearGridAndPersist]);

  const handleShowMoreResults = useCallback(() => {
    setVisibleResultsCount((current) =>
      Math.min(searchResults.length, current + visibleResultsStep),
    );
  }, [searchResults.length]);

  const handleCoverLinkOpen = useCallback(() => {
    if (selectedMediaType !== 'books' && selectedMediaType !== 'music') {
      return;
    }
    setCoverLinkMediaType(selectedMediaType);
    setShowCoverLinkModal(true);
  }, [selectedMediaType]);

  const handleCoverLinkSave = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      setSearchValues((current) => ({
        ...current,
        coverUrl: trimmed,
      }));
      setShowCoverLinkModal(false);
      if (!trimmed) {
        return;
      }
      const results = await runSearch({
        ...searchValues,
        coverUrl: trimmed,
      });
      if (results.length > 0) {
        handleAddMedia(results[0], results);
      }
    },
    [setSearchValues, runSearch, searchValues, handleAddMedia],
  );

  const handleCoverLinkClear = useCallback(() => {
    setSearchValues((current) => {
      if (!current.coverUrl) {
        return current;
      }
      const next = { ...current };
      delete next.coverUrl;
      return next;
    });
    setShowCoverLinkModal(false);
  }, [setSearchValues]);

  const visibleResults = searchResults.slice(0, visibleResultsCount);
  const showMoreCount = Math.min(
    visibleResultsStep,
    Math.max(0, searchResults.length - visibleResultsCount),
  );
  const coverLinkPrimaryValue =
    coverLinkMediaType === 'books'
      ? (searchValues.title ?? '')
      : (searchValues.album ?? '');
  const coverLinkSecondaryValue =
    coverLinkMediaType === 'books'
      ? (searchValues.author ?? '')
      : (searchValues.artist ?? '');
  const coverLinkTypeLabel = coverLinkMediaType === 'books' ? 'book' : 'album';

  useSearchBridges({
    gridItems,
    showSearch,
    searchValues,
    selectedMediaType,
    layoutDimension,
    runSearch,
    setSelectedMediaType,
    setLayoutDimension,
    handleAddMedia,
    handleRemoveMedia,
    handleShowSearchToggle,
    handleClearGrid,
  });

  const searchSectionClassName = `search-section ${showSearch ? 'show-search' : 'hide-search'}`;
  const searchModuleClassName = `search-module ${showSearch ? 'show-search' : 'hide-search'}`;

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
        showSearch={showSearch}
        onShowSearchToggle={handleShowSearchToggle}
        layoutDimension={layoutDimension}
        onLayoutDimensionChange={setLayoutDimension}
        bandPlacementMode={bandPlacementMode}
        onBandPlacementModeChange={setBandPlacementMode}
        captionMode={captionMode}
        onCaptionModeChange={setCaptionMode}
        captionEditsOnly={captionEditsOnly}
        onCaptionEditsOnlyChange={setCaptionEditsOnly}
        onShare={handleCreateShare}
        isSharing={isSharing}
        shareUrl={shareUrl}
        shareError={shareError}
        isLoadingShare={isLoadingShare}
        coverViewMode={coverViewMode}
        onCoverViewModeChange={setCoverViewMode}
      />

      {showSearch && (
        <MediaForm
          mediaType={selectedMediaType}
          onMediaTypeChange={handleMediaTypeChange}
          searchValues={searchValues}
          onFieldChange={handleFieldChange}
          onSubmit={handleFormSubmit}
          isLoading={searchIsLoading}
          provider={provider}
          layout="band"
          bandPlacement={bandPlacement}
          onOpenCoverLink={handleCoverLinkOpen}
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
                setBrokenAlternateCoverUrls({});

                fetchAlternateCovers(
                  item.id,
                  item.type as MediaType,
                  item.alternateCoverUrls,
                );
                setShowPosterGrid(true);
              }}
              onCaptionEdit={(item) => {
                setActiveCaptionItemId(item.id);
                setShowCaptionModal(true);
              }}
              columns={columns}
              minRows={minRows}
              placeholderLabel={
                gridItems.length === 0
                  ? getEmptyStateLabel(selectedMediaType)
                  : undefined
              }
              captionMode={captionMode}
              captionEditsOnly={captionEditsOnly}
              onAspectRatioUpdate={handleAspectRatioUpdate}
              layoutDimension={layoutDimension}
            />
            {showSearch && (
              <MediaForm
                mediaType={selectedMediaType}
                onMediaTypeChange={handleMediaTypeChange}
                searchValues={searchValues}
                onFieldChange={handleFieldChange}
                onSubmit={handleFormSubmit}
                isLoading={searchIsLoading}
                provider={provider}
                layout="stack"
                bandPlacement={bandPlacement}
                onOpenCoverLink={handleCoverLinkOpen}
              />
            )}
          </div>
          {showPosterGrid && activePosterItem && (
            <PosterPicker
              coverViewMode={coverViewMode}
              urls={visibleAlternateCoverUrls}
              mediaTitle={activePosterItem.title}
              mediaSubtitle={activePosterItem.subtitle}
              mediaType={activePosterItem.type}
              selectedCoverUrl={
                activePosterItem.coverUrl || activePosterItem.coverThumbnailUrl
              }
              alternateItems={activePosterItem.alternateCoverItems}
              onCoverError={(url) => {
                setBrokenAlternateCoverUrls((current) => {
                  if (Object.hasOwn(current, url)) {
                    return current;
                  }
                  return { ...current, [url]: true };
                });
              }}
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
                results={visibleResults}
                availableCovers={searchResults}
                mediaType={selectedMediaType}
                searchSummary={searchSummary}
                brokenResultIds={brokenSearchResultIds}
                aspectRatios={searchResultAspectRatios}
                onClose={closeSearchResults}
                onAdd={handleAddMedia}
                onPosterLoad={handleSearchResultImageLoad}
                onPosterError={handleSearchResultImageError}
                showMoreCount={showMoreCount}
                onShowMore={handleShowMoreResults}
              />
            )}
          <CoverLinkModal
            isOpen={showCoverLinkModal}
            primaryValue={coverLinkPrimaryValue}
            secondaryValue={coverLinkSecondaryValue}
            coverTypeLabel={coverLinkTypeLabel}
            coverUrl={searchValues.coverUrl ?? ''}
            onClose={() => setShowCoverLinkModal(false)}
            onSave={handleCoverLinkSave}
            onClear={handleCoverLinkClear}
          />
          {activeCaptionItem && (
            <CaptionModal
              isOpen={showCaptionModal}
              title={activeCaptionItem.title}
              subtitle={activeCaptionItem.subtitle}
              caption={activeCaptionItem.caption ?? ''}
              onClose={closeCaptionModal}
              onSave={(value) => {
                setGridItems((current) =>
                  current.map((item) =>
                    item.id === activeCaptionItem.id
                      ? { ...item, caption: value }
                      : item,
                  ),
                );
                closeCaptionModal();
              }}
              onClear={() => {
                setGridItems((current) =>
                  current.map((item) =>
                    item.id === activeCaptionItem.id
                      ? { ...item, caption: '' }
                      : item,
                  ),
                );
                closeCaptionModal();
              }}
            />
          )}
        </div>
      </div>
      {searchIsLoading && (
        <div className="search-loading">
          <div className="search-loading-spinner" />
          <p>Loading results...</p>
        </div>
      )}
      {searchError && <div className="search-error">{searchError}</div>}
    </div>
  );
};

export default MediaSearch;
