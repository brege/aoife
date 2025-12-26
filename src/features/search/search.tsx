import type React from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import '../../app/app.css';
import './search.css';
import { useGridOperations } from '../../lib/grid-operations';
import { useLocalStorageString } from '../../lib/hooks';
import logger from '../../lib/logger';
import { useModalClosed, useModalManager } from '../../lib/modalmanager';
import { useAppStore } from '../../lib/store';
import { getMediaProvider } from '../../providers';
import { useMediaSearch } from '../../providers/queries';
import type { MediaSearchValues, MediaType } from '../../providers/types';
import AppHeader from '../../ui/header';
import Grid from '../grid/grid';
import { useSearchBridges } from './bridge';
import { MediaForm } from './form/form';
import { EditModal } from './modals/edit';
import { PosterPicker } from './picker/picker';
import { SearchResults } from './results/results';

const DEFAULT_TITLE = 'aoife';
const VISIBLE_RESULTS_STEP = 12;

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
    logger.level = 'debug';
    logger.info(
      { context: 'MediaSearch' },
      'MediaSearch component initialized',
    );
  }, []);

  const columns = useAppStore((state) => state.columns);
  const minRows = useAppStore((state) => state.minRows);
  const layoutDimension = useAppStore((state) => state.layoutDimension);
  const bandPlacementMode = useAppStore((state) => state.bandPlacementMode);
  const captionMode = useAppStore((state) => state.captionMode);
  const captionEditsOnly = useAppStore((state) => state.captionEditsOnly);
  const selectedMediaType = useAppStore((state) => state.selectedMediaType);
  const gridItems = useAppStore((state) => state.gridItems);
  const title = useAppStore((state) => state.title);
  const showSearch = useAppStore((state) => state.showSearch);
  const visibleResultsCount = useAppStore((state) => state.visibleResultsCount);
  const showPosterGrid = useAppStore((state) => state.showPosterGrid);
  const showCoverLinkModal = useAppStore((state) => state.showCoverLinkModal);
  const showCaptionModal = useAppStore((state) => state.showCaptionModal);
  const coverLinkMediaType = useAppStore((state) => state.coverLinkMediaType);
  const activePosterItemId = useAppStore((state) => state.activePosterItemId);
  const activeCaptionItemId = useAppStore((state) => state.activeCaptionItemId);
  const alternateCoverUrls = useAppStore((state) => state.alternateCoverUrls);
  const brokenAlternateCoverUrls = useAppStore(
    (state) => state.brokenAlternateCoverUrls,
  );
  const shareUrl = useAppStore((state) => state.shareUrl);
  const shareError = useAppStore((state) => state.shareError);
  const isSharing = useAppStore((state) => state.isSharing);
  const isLoadingShare = useAppStore((state) => state.isLoadingShare);
  const brokenSearchResultIds = useAppStore(
    (state) => state.brokenSearchResultIds,
  );
  const searchResultAspectRatios = useAppStore(
    (state) => state.searchResultAspectRatios,
  );
  const lastSearchSummary = useAppStore((state) => state.lastSearchSummary);
  const friendlyError = useAppStore((state) => state.friendlyError);

  const setColumns = useAppStore((state) => state.setColumns);
  const setMinRows = useAppStore((state) => state.setMinRows);
  const setLayoutDimension = useAppStore((state) => state.setLayoutDimension);
  const setBandPlacementMode = useAppStore(
    (state) => state.setBandPlacementMode,
  );
  const setCaptionMode = useAppStore((state) => state.setCaptionMode);
  const setCaptionEditsOnly = useAppStore((state) => state.setCaptionEditsOnly);
  const setSelectedMediaType = useAppStore(
    (state) => state.setSelectedMediaType,
  );
  const setGridItems = useAppStore((state) => state.setGridItems);
  const setTitle = useAppStore((state) => state.setTitle);
  const clearGrid = useAppStore((state) => state.clearGrid);
  const setShowSearch = useAppStore((state) => state.setShowSearch);
  const setVisibleResultsCount = useAppStore(
    (state) => state.setVisibleResultsCount,
  );
  const setShowPosterGrid = useAppStore((state) => state.setShowPosterGrid);
  const setShowCoverLinkModal = useAppStore(
    (state) => state.setShowCoverLinkModal,
  );
  const setShowCaptionModal = useAppStore((state) => state.setShowCaptionModal);
  const setCoverLinkMediaType = useAppStore(
    (state) => state.setCoverLinkMediaType,
  );
  const setActivePosterItemId = useAppStore(
    (state) => state.setActivePosterItemId,
  );
  const setActiveCaptionItemId = useAppStore(
    (state) => state.setActiveCaptionItemId,
  );
  const setAlternateCoverUrls = useAppStore(
    (state) => state.setAlternateCoverUrls,
  );
  const [coverViewMode, setCoverViewMode] = useLocalStorageString(
    'cover-view-mode',
    'grid',
    ['grid', 'carousel'],
  );
  const resetBrokenAlternateCoverUrls = useAppStore(
    (state) => state.resetBrokenAlternateCoverUrls,
  );
  const setBrokenAlternateCoverUrl = useAppStore(
    (state) => state.setBrokenAlternateCoverUrl,
  );
  const handleCreateShare = useAppStore((state) => state.handleCreateShare);
  const resetShareContext = useAppStore((state) => state.resetShareContext);
  const checkShareDivergence = useAppStore(
    (state) => state.checkShareDivergence,
  );
  const setBrokenSearchResultId = useAppStore(
    (state) => state.setBrokenSearchResultId,
  );
  const setSearchResultAspectRatio = useAppStore(
    (state) => state.setSearchResultAspectRatio,
  );
  const setLastSearchSummary = useAppStore(
    (state) => state.setLastSearchSummary,
  );
  const setFriendlyError = useAppStore((state) => state.setFriendlyError);
  const resetSearchUi = useAppStore((state) => state.resetSearchUi);

  const mediaSearch = useMediaSearch();
  const searchResults = mediaSearch.data;
  const searchIsLoading = mediaSearch.isLoading;
  const searchError = friendlyError || mediaSearch.error;

  const provider = useMemo(
    () => getMediaProvider(selectedMediaType),
    [selectedMediaType],
  );

  const formMethods = useForm<MediaSearchValues>({
    defaultValues: provider.defaultSearchValues,
    mode: 'onChange',
  });
  const watchedValues = useWatch({ control: formMethods.control });
  const searchValues: MediaSearchValues = useMemo(
    () => ({
      ...provider.defaultSearchValues,
      ...Object.fromEntries(
        Object.entries(watchedValues ?? {}).filter(
          (entry): entry is [string, string] => entry[1] !== undefined,
        ),
      ),
    }),
    [provider.defaultSearchValues, watchedValues],
  );

  useEffect(() => {
    formMethods.reset(provider.defaultSearchValues);
  }, [formMethods, provider.defaultSearchValues]);

  useEffect(() => {
    const unsubscribe = useAppStore.subscribe((state, previousState) => {
      if (
        state.gridItems !== previousState.gridItems ||
        state.columns !== previousState.columns ||
        state.minRows !== previousState.minRows ||
        state.layoutDimension !== previousState.layoutDimension ||
        state.title !== previousState.title
      ) {
        checkShareDivergence();
      }
    });
    return unsubscribe;
  }, [checkShareDivergence]);

  const runSearch = useCallback(
    async (
      values: Partial<MediaSearchValues>,
      mediaTypeOverride?: MediaType,
    ) => {
      const activeMediaType = mediaTypeOverride ?? selectedMediaType;
      const activeProvider =
        activeMediaType === selectedMediaType
          ? provider
          : getMediaProvider(activeMediaType);
      const mergedValues = {
        ...activeProvider.defaultSearchValues,
        ...Object.fromEntries(
          Object.entries(values).filter(([, v]) => v !== undefined),
        ),
      } as MediaSearchValues;

      setFriendlyError('');
      resetSearchUi();

      try {
        const results = await mediaSearch.search(activeMediaType, mergedValues);

        logger.info(
          {
            context: 'MediaSearch.runSearch',
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

        const parts = activeProvider.searchFields
          .map((field) => mergedValues[field.id]?.trim())
          .filter(Boolean);
        setLastSearchSummary(parts.join(' • '));

        return results;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const friendly = message.includes('not yet implemented')
          ? `${activeProvider.label} search is not configured yet. Wire up its cover API to enable it.`
          : 'An error occurred while searching.';

        setFriendlyError(friendly);

        logger.error(
          {
            context: 'MediaSearch.runSearch',
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
      provider,
      selectedMediaType,
      setFriendlyError,
      setLastSearchSummary,
      setSelectedMediaType,
      resetSearchUi,
    ],
  );

  const closeSearchResults = useCallback(() => {
    logger.debug(
      { context: 'MediaSearch.closeSearchResults' },
      'Closing search results',
    );
    mediaSearch.reset();
    resetSearchUi();
  }, [mediaSearch, resetSearchUi]);

  const handleSearchResultImageLoad = useCallback(
    (
      resultId: string | number,
      event: React.SyntheticEvent<HTMLImageElement>,
    ) => {
      const imageElement = event.currentTarget;
      if (imageElement.naturalWidth > 0 && imageElement.naturalHeight > 0) {
        const aspectRatio =
          imageElement.naturalWidth / imageElement.naturalHeight;
        const constrained = Math.max(0.5, Math.min(2, aspectRatio));
        setSearchResultAspectRatio(resultId, constrained);
      }
    },
    [setSearchResultAspectRatio],
  );

  const handleSearchResultImageError = useCallback(
    (resultId: string | number) => {
      setBrokenSearchResultId(resultId);
    },
    [setBrokenSearchResultId],
  );

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
    handleAddMedia,
    handleRemoveMedia,
    handleAspectRatioUpdate,
    handleSelectAlternatePoster,
    handleClosePosterGrid,
    fetchAlternateCovers,
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
      setSearchResults: mediaSearch.setData,
      resetSearchValues: formMethods.reset,
      setAlternateCoverUrls,
      setShowPosterGrid,
      setActivePosterItemId,
    },
  );

  const handleReorderMedia = useCallback(
    (sourceId: string | number, targetId: string | number) => {
      setGridItems((current) => {
        if (sourceId === targetId) return current;
        const sourceIndex = current.findIndex((item) => item.id === sourceId);
        const targetIndex = current.findIndex((item) => item.id === targetId);
        if (sourceIndex === -1 || targetIndex === -1) return current;
        const next = [...current];
        const [moved] = next.splice(sourceIndex, 1);
        next.splice(targetIndex, 0, moved);
        logger.info(
          {
            context: 'MediaSearch.handleReorderMedia',
            action: 'grid_reorder',
            sourceId,
            targetId,
            sourceIndex,
            targetIndex,
            timestamp: Date.now(),
          },
          'GRID: Reordered media',
        );
        return next;
      });
    },
    [setGridItems],
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
    const rootElement = document.documentElement;
    if (!showSearch) {
      rootElement.style.removeProperty('--stack-form-height');
      return;
    }

    const stackFormElement = document.querySelector('.media-search-form.stack');
    if (!(stackFormElement instanceof HTMLElement)) {
      rootElement.style.removeProperty('--stack-form-height');
      return;
    }

    const updateStackFormHeight = () => {
      const height = Math.ceil(stackFormElement.getBoundingClientRect().height);
      rootElement.style.setProperty('--stack-form-height', `${height}px`);
    };

    updateStackFormHeight();

    const resizeObserver =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(updateStackFormHeight)
        : null;

    if (resizeObserver) {
      resizeObserver.observe(stackFormElement);
    }

    const mediaQueryList = window.matchMedia('(max-width: 600px)');
    const handleMediaQueryChange = () => {
      if (mediaQueryList.matches) {
        updateStackFormHeight();
        return;
      }
      rootElement.style.removeProperty('--stack-form-height');
    };

    mediaQueryList.addEventListener('change', handleMediaQueryChange);

    return () => {
      mediaQueryList.removeEventListener('change', handleMediaQueryChange);
      resizeObserver?.disconnect();
    };
  }, [showSearch]);

  useEffect(() => {
    setVisibleResultsCount(
      Math.min(searchResults.length, VISIBLE_RESULTS_STEP),
    );
  }, [searchResults.length, setVisibleResultsCount]);

  useModalClosed('searchResults', closeSearchResults);

  const handleFormSubmit = useCallback(
    async (values: MediaSearchValues) => {
      const results = await runSearch(values);
      const hasDirectCover =
        (selectedMediaType === 'books' || selectedMediaType === 'music') &&
        Boolean(values.coverUrl?.trim());
      if (
        (selectedMediaType === 'custom' || hasDirectCover) &&
        results.length > 0
      ) {
        handleAddMedia(results[0], results);
      }
    },
    [runSearch, selectedMediaType, handleAddMedia],
  );

  const handleTitleChange = useCallback(
    (nextTitle: string) => {
      setTitle(normalizeTitle(nextTitle));
    },
    [setTitle],
  );

  const clearGridAndPersist = useCallback(
    (source: string) => {
      clearGrid();
      setSelectedMediaType('movies');
      resetShareContext();
      logger.info(
        {
          context: 'MediaSearch.clearGridAndPersist',
          action: 'grid_cleared',
          timestamp: Date.now(),
        },
        source,
      );
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
  }, [setShowCaptionModal, setActiveCaptionItemId]);

  useModalClosed('caption', closeCaptionModal);

  const searchSummary = lastSearchSummary || provider.label;
  const bandPlacement: 'top' | 'bottom' =
    bandPlacementMode === 'adaptive' &&
    gridItems.length > 0 &&
    searchResults.length === 0
      ? 'bottom'
      : 'top';

  const handleMediaTypeChange = (type: MediaType) => {
    setSelectedMediaType(type);
  };

  const handleShowSearchToggle = useCallback(
    (enabled: boolean) => {
      setShowSearch(enabled);
      logger.info(
        {
          context: 'MediaSearch.handleShowSearchToggle',
          action: 'search_toggle',
          showSearch: enabled,
          timestamp: Date.now(),
        },
        `SEARCH: ${enabled ? 'Showing' : 'Hiding'} search`,
      );
    },
    [setShowSearch],
  );

  const handleClearGrid = useCallback(() => {
    clearGridAndPersist('CLEAR: Grid cleared via hamburger menu');
  }, [clearGridAndPersist]);

  const handleShowMoreResults = useCallback(() => {
    setVisibleResultsCount(
      Math.min(
        searchResults.length,
        visibleResultsCount + VISIBLE_RESULTS_STEP,
      ),
    );
  }, [searchResults.length, visibleResultsCount, setVisibleResultsCount]);

  const handleCoverLinkOpen = useCallback(() => {
    if (selectedMediaType !== 'books' && selectedMediaType !== 'music') return;
    setCoverLinkMediaType(selectedMediaType);
    setShowCoverLinkModal(true);
  }, [selectedMediaType, setCoverLinkMediaType, setShowCoverLinkModal]);

  const handleCoverLinkSave = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      formMethods.setValue('coverUrl', trimmed);
      setShowCoverLinkModal(false);
      if (!trimmed) return;
      const nextValues = formMethods.getValues();
      const results = await runSearch({ ...nextValues, coverUrl: trimmed });
      if (results.length > 0) {
        handleAddMedia(results[0], results);
      }
    },
    [formMethods, runSearch, handleAddMedia, setShowCoverLinkModal],
  );

  const handleCoverLinkClear = useCallback(() => {
    formMethods.setValue('coverUrl', '');
    setShowCoverLinkModal(false);
  }, [formMethods, setShowCoverLinkModal]);

  const visibleResults = searchResults.slice(0, visibleResultsCount);
  const showMoreCount = Math.min(
    VISIBLE_RESULTS_STEP,
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

  const mediaFormProperties = {
    mediaType: selectedMediaType,
    onMediaTypeChange: handleMediaTypeChange,
    onSubmit: handleFormSubmit,
    isLoading: searchIsLoading,
    provider,
    bandPlacement,
    onOpenCoverLink: handleCoverLinkOpen,
    formMethods,
  };

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

      {showSearch && <MediaForm {...mediaFormProperties} layout="band" />}

      <div className={searchSectionClassName}>
        <div className="search-content">
          <div className={searchModuleClassName}>
            <Grid
              items={gridItems}
              onRemoveMedia={handleRemoveMedia}
              onPosterClick={(item) => {
                logger.info(
                  {
                    context: 'MediaSearch.Grid.onPosterClick',
                    action: 'poster_grid_open',
                    media: { id: item.id, title: item.title, type: item.type },
                    timestamp: Date.now(),
                  },
                  `GRID: Opening alternate poster grid for "${item.title}"`,
                );
                setActivePosterItemId(item.id);
                resetBrokenAlternateCoverUrls();
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
              onReorderMedia={handleReorderMedia}
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
              <MediaForm {...mediaFormProperties} layout="stack" />
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
              onCoverError={(url) => setBrokenAlternateCoverUrl(url)}
              onClose={handleClosePosterGrid}
              onSelectCarouselCover={(url) => {
                logger.info(
                  {
                    context: 'Carousel',
                    action: 'poster_change',
                    posterPath: url,
                    timestamp: Date.now(),
                  },
                  'POSTER: Selected alternate poster from carousel',
                );
                handleSelectAlternatePoster(url);
              }}
              onSelectGridCover={(url, index) => {
                logger.info(
                  {
                    context: 'Grid.onSelectAlternatePoster',
                    action: 'poster_change',
                    posterIndex: index + 1,
                    posterPath: url,
                    timestamp: Date.now(),
                  },
                  `POSTER: Selected alternate poster ${index + 1}`,
                );
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
          <EditModal
            mode="cover"
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
            <EditModal
              mode="caption"
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
