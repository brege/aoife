import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MdClose } from 'react-icons/md';
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
import Grid2x2 from '../grid/grid';
import AppHeader from '../ui/header';
import { useSearchBridges } from './bridge';
import Carousel from './carousel';
import { MediaForm } from './mediaform';

const GRID_CAPACITY = 4;

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
    searchInputRef,
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
    return stored ?? DEFAULT_TITLE;
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
  const { shareUrl, shareError, isSharing, isLoadingShare, handleCreateShare } =
    useShareState({
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
    setTitle(nextTitle);
  }, []);

  const clearGridAndPersist = useCallback(
    (source: string) => {
      clearGrid();
      logger.info(source, {
        context: 'MediaSearch.clearGridAndPersist',
        action: 'grid_cleared',
        timestamp: Date.now(),
      });
    },
    [clearGrid],
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

  useEffect(() => {
    if (isBuilderMode) {
      searchInputRef.current?.focus();
    }
  }, [isBuilderMode, searchInputRef]);

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

  useSearchBridges({
    gridItems,
    gridCapacity: GRID_CAPACITY,
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
              columns={columns}
              minRows={minRows}
              placeholderLabel={
                gridItems.length === 0 ? provider.resultLabel : undefined
              }
              isBuilderMode={isBuilderMode}
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
          {showPosterGrid &&
            activePosterItem &&
            (coverViewMode === 'carousel' ? (
              <Carousel
                urls={alternateCoverUrls}
                mediaTitle={activePosterItem.title}
                onSelectCover={(url) => {
                  logger.info(
                    `POSTER: Selected alternate poster from carousel`,
                    {
                      context: 'Carousel',
                      action: 'poster_change',
                      posterPath: url,
                      timestamp: Date.now(),
                    },
                  );
                  handleSelectAlternatePoster(url);
                }}
                onClose={handleClosePosterGrid}
              />
            ) : (
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
                    <div className="poster-picker-empty">
                      No alternate covers
                    </div>
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
            ))}
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
