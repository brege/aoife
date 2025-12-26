import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import '../../app/app.css';
import './search.css';
import { useGridOperations } from '../../lib/grid-operations';
import logger from '../../lib/logger';
import { useModalClosed, useModalManager } from '../../lib/modalmanager';
import { useLayoutState } from '../../lib/state/layout';
import { useShareState } from '../../lib/state/share';
import { DEFAULT_TITLE, TITLE_STORAGE_KEY } from '../../lib/state/storage';
import type {
  MediaItem,
  MediaSearchValues,
  MediaType,
} from '../../providers/types';
import AppHeader from '../../ui/header';
import Grid from '../grid/grid';
import { useSearchBridges } from './bridge';
import { MediaForm } from './form/form';
import { EditModal } from './modals/edit';
import { PosterPicker } from './picker/picker';
import { SearchResults } from './results/results';
import { useSearchState } from './state';

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
      {
        context: 'MediaSearch',
      },
      'MediaSearch component initialized',
    );
  }, []);

  const [showSearch, setShowSearch] = useState(true);
  const visibleResultsStep = 12;
  const [visibleResultsCount, setVisibleResultsCount] =
    useState(visibleResultsStep);

  const {
    selectedMediaType,
    searchResults,
    brokenSearchResultIds,
    searchResultAspectRatios,
    lastSearchSummary,
    isLoading: searchIsLoading,
    error: searchError,
    setSelectedMediaType,
    runSearch,
    handleSearchResultImageLoad,
    handleSearchResultImageError,
    closeSearchResults,
    provider,
    setSearchResults,
  } = useSearchState({ showSearch });
  const formMethods = useForm<MediaSearchValues>({
    defaultValues: provider.defaultSearchValues,
    mode: 'onChange',
  });
  const watchedValues = useWatch({ control: formMethods.control });
  const searchValues = useMemo(
    () => ({
      ...provider.defaultSearchValues,
      ...(watchedValues ?? {}),
    }),
    [provider.defaultSearchValues, watchedValues],
  );

  useEffect(() => {
    formMethods.reset(provider.defaultSearchValues);
  }, [formMethods, provider.defaultSearchValues]);

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
      resetSearchValues: formMethods.reset,
      setAlternateCoverUrls,
      setShowPosterGrid,
      setActivePosterItemId,
    },
  );

  const handleReorderMedia = useCallback(
    (sourceId: string | number, targetId: string | number) => {
      setGridItems((current) => {
        if (sourceId === targetId) {
          return current;
        }
        const sourceIndex = current.findIndex((item) => item.id === sourceId);
        const targetIndex = current.findIndex((item) => item.id === targetId);
        if (sourceIndex === -1 || targetIndex === -1) {
          return current;
        }
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
    [],
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
        ? new ResizeObserver(() => {
            updateStackFormHeight();
          })
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
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [showSearch]);

  useEffect(() => {
    setVisibleResultsCount(Math.min(searchResults.length, visibleResultsStep));
  }, [searchResults]);

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

  const handleTitleChange = useCallback((nextTitle: string) => {
    setTitle(normalizeTitle(nextTitle));
  }, []);

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
  }, []);

  useModalClosed('caption', closeCaptionModal);

  const searchSummary = lastSearchSummary || provider.label;
  const bandPlacement =
    bandPlacementMode === 'adaptive' &&
    gridItems.length > 0 &&
    searchResults.length === 0
      ? 'bottom'
      : 'top';

  const handleMediaTypeChange = (type: MediaType) => {
    setSelectedMediaType(type);
  };

  const handleShowSearchToggle = useCallback((enabled: boolean) => {
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
      formMethods.setValue('coverUrl', trimmed);
      setShowCoverLinkModal(false);
      if (!trimmed) {
        return;
      }
      const nextValues = formMethods.getValues();
      const results = await runSearch({
        ...nextValues,
        coverUrl: trimmed,
      });
      if (results.length > 0) {
        handleAddMedia(results[0], results);
      }
    },
    [formMethods, runSearch, handleAddMedia],
  );

  const handleCoverLinkClear = useCallback(() => {
    formMethods.setValue('coverUrl', '');
    setShowCoverLinkModal(false);
  }, [formMethods]);

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

      {showSearch && (
        <MediaForm {...mediaFormProperties} layout="band" />
      )}

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
