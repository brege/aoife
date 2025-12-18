import { useCallback } from 'react';
import logger from './logger';
import { getMediaService } from '../media/factory';
import type { getMediaProvider } from '../media/providers';
import type { MediaItem, MediaSearchValues, MediaType } from '../media/types';

type GridOperationDeps = {
  selectedMediaType: MediaType;
  searchValues: MediaSearchValues;
  searchResults: MediaItem[];
  provider: ReturnType<typeof getMediaProvider>;
  gridItems: MediaItem[];
  activePosterItemId: string | number | null;
};

type GridOperationSetters = {
  setGridItems: (items: MediaItem[] | ((current: MediaItem[]) => MediaItem[])) => void;
  setSearchResults: (results: MediaItem[]) => void;
  setSearchValues: (values: MediaSearchValues | ((prev: MediaSearchValues) => MediaSearchValues)) => void;
  setAlternateCoverUrls: (urls: string[]) => void;
  setShowPosterGrid: (show: boolean) => void;
  setActivePosterItemId: (id: string | number | null) => void;
};

type GridOperations = {
  handleAddMedia: (media: MediaItem, availableCovers?: MediaItem[]) => void;
  handleRemoveMedia: (mediaId: string | number) => void;
  handleAspectRatioUpdate: (mediaId: string | number, aspectRatio: number) => void;
  handleSelectAlternatePoster: (url: string) => void;
  handleClosePosterGrid: () => void;
  fetchAlternateCovers: (
    mediaId: string | number,
    mediaType: MediaType,
    storedCovers?: string[],
  ) => Promise<void>;
  clearGrid: () => void;
};

export const useGridOperations = (
  deps: GridOperationDeps,
  setters: GridOperationSetters,
): GridOperations => {
  const {
    selectedMediaType,
    searchValues,
    searchResults,
    provider,
    gridItems,
    activePosterItemId,
  } = deps;
  const {
    setGridItems,
    setSearchResults,
    setSearchValues,
    setAlternateCoverUrls,
    setShowPosterGrid,
    setActivePosterItemId,
  } = setters;

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

        logger.info(
          `GRID: Added "${media.title}" to position ${current.length}`,
          {
            context: 'GridOperations.handleAddMedia',
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
      selectedMediaType,
      searchValues,
      setGridItems,
      setSearchResults,
      setSearchValues,
    ],
  );

  const handleRemoveMedia = useCallback(
    (mediaId: string | number) => {
      setGridItems((current) => {
        const mediaToRemove = current.find((m) => m.id === mediaId);
        const removedPosition = current.findIndex((m) => m.id === mediaId);
        const updatedGrid = current.filter((media) => media.id !== mediaId);

        logger.info(
          `GRID: Removed "${mediaToRemove?.title || 'unknown'}" from position ${removedPosition}`,
          {
            context: 'GridOperations.handleRemoveMedia',
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
    [setGridItems],
  );

  const handleAspectRatioUpdate = useCallback(
    (mediaId: string | number, aspectRatio: number) => {
      setGridItems((current) => {
        const updated = current.map((item) =>
          item.id === mediaId ? { ...item, aspectRatio } : item,
        );
        return updated;
      });
    },
    [setGridItems],
  );

  const handleSelectAlternatePoster = useCallback(
    (url: string) => {
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
        context: 'GridOperations.handleSelectAlternatePoster',
        action: 'poster_applied',
        media: updatedItem
          ? { id: updatedItem.id, title: updatedItem.title }
          : null,
        url,
      });

      setGridItems(updatedGrid);
      setShowPosterGrid(false);
      setActivePosterItemId(null);
    },
    [activePosterItemId, gridItems, setGridItems, setShowPosterGrid, setActivePosterItemId],
  );

  const handleClosePosterGrid = useCallback(() => {
    logger.info('POSTER: Closing alternate poster grid', {
      context: 'GridOperations.handleClosePosterGrid',
      action: 'poster_grid_close',
      timestamp: Date.now(),
    });
    setShowPosterGrid(false);
    setActivePosterItemId(null);
    setAlternateCoverUrls([]);
  }, [setShowPosterGrid, setActivePosterItemId, setAlternateCoverUrls]);

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
          context: 'GridOperations.fetchAlternateCovers',
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
    [setAlternateCoverUrls],
  );

  const clearGrid = useCallback(() => {
    setGridItems([]);
  }, [setGridItems]);

  return {
    handleAddMedia,
    handleRemoveMedia,
    handleAspectRatioUpdate,
    handleSelectAlternatePoster,
    handleClosePosterGrid,
    fetchAlternateCovers,
    clearGrid,
  };
};
