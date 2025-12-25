import { useCallback } from 'react';
import type { getMediaProvider } from '../providers';
import { getMediaService } from '../providers/factory';
import type {
  MediaItem,
  MediaSearchValues,
  MediaType,
} from '../providers/types';
import { TMDB_IMAGE_BASE } from '../providers/types';
import logger from './logger';

type GridOperationDeps = {
  selectedMediaType: MediaType;
  searchValues: MediaSearchValues;
  searchResults: MediaItem[];
  provider: ReturnType<typeof getMediaProvider>;
  gridItems: MediaItem[];
  activePosterItemId: string | number | null;
};

type GridOperationSetters = {
  setGridItems: (
    items: MediaItem[] | ((current: MediaItem[]) => MediaItem[]),
  ) => void;
  setSearchResults: (results: MediaItem[]) => void;
  resetSearchValues: (values: MediaSearchValues) => void;
  setAlternateCoverUrls: (urls: string[]) => void;
  setShowPosterGrid: (show: boolean) => void;
  setActivePosterItemId: (id: string | number | null) => void;
};

type GridOperations = {
  handleAddMedia: (media: MediaItem, availableCovers?: MediaItem[]) => void;
  handleRemoveMedia: (mediaId: string | number) => void;
  handleAspectRatioUpdate: (
    mediaId: string | number,
    aspectRatio: number,
  ) => void;
  handleSelectAlternatePoster: (url: string) => void;
  handleClosePosterGrid: () => void;
  fetchAlternateCovers: (
    mediaId: string | number,
    mediaType: MediaType,
    storedCovers?: string[],
  ) => Promise<void>;
  clearGrid: () => void;
};

const resolveCoverUrl = (item: MediaItem): string | null => {
  return item.coverUrl || item.coverThumbnailUrl || null;
};

const findCoverItem = (
  items: MediaItem[] | undefined,
  url: string,
): MediaItem | null => {
  if (!items) {
    return null;
  }
  const match = items.find(
    (item) => item.coverUrl === url || item.coverThumbnailUrl === url,
  );
  return match || null;
};

const getTmdbPosterPath = (url: string): string | null => {
  if (!url.startsWith(TMDB_IMAGE_BASE)) {
    return null;
  }
  const trimmed = url.replace(TMDB_IMAGE_BASE, '');
  const segments = trimmed.split('/').filter(Boolean);
  if (segments.length < 2) {
    return null;
  }
  return `/${segments.slice(1).join('/')}`;
};

const mergeSelectedCover = (
  urls: string[],
  selectedCoverUrl: string | null,
): string[] => {
  if (!selectedCoverUrl) {
    return urls;
  }
  if (urls.includes(selectedCoverUrl)) {
    return urls;
  }
  return [selectedCoverUrl, ...urls];
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
    resetSearchValues,
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
        const coverItems: MediaItem[] = [];
        for (const result of coversSource) {
          const coverUrl = resolveCoverUrl(result);
          if (!coverUrl) {
            continue;
          }
          coverItems.push({
            ...result,
            coverUrl: coverUrl,
            coverThumbnailUrl: result.coverThumbnailUrl || coverUrl,
          });
        }

        if (coverItems.length > 0) {
          mediaWithCovers.alternateCoverUrls = coverItems.map(
            (result) => result.coverUrl as string,
          );
          mediaWithCovers.alternateCoverItems = coverItems;
        }
      }

      setGridItems((current) => {
        const updatedGrid = [...current, mediaWithCovers];

        logger.info(
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
          `GRID: Added "${media.title}" to position ${current.length}`,
        );

        return updatedGrid;
      });
      setSearchResults([]);
      resetSearchValues(provider.defaultSearchValues);
    },
    [
      provider.defaultSearchValues,
      searchResults,
      selectedMediaType,
      searchValues,
      setGridItems,
      setSearchResults,
      resetSearchValues,
    ],
  );

  const handleRemoveMedia = useCallback(
    (mediaId: string | number) => {
      setGridItems((current) => {
        const mediaToRemove = current.find((m) => m.id === mediaId);
        const removedPosition = current.findIndex((m) => m.id === mediaId);
        const updatedGrid = current.filter((media) => media.id !== mediaId);

        logger.info(
          {
            context: 'GridOperations.handleRemoveMedia',
            action: 'grid_media_removed',
            mediaId,
            position: removedPosition,
            gridCount: updatedGrid.length,
            timestamp: Date.now(),
          },
          `GRID: Removed "${mediaToRemove?.title || 'unknown'}" from position ${removedPosition}`,
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

      const updatedGrid = gridItems.map((item) => {
        if (item.id !== activePosterItemId) {
          return item;
        }

        const alternateItem = findCoverItem(item.alternateCoverItems, url);
        const nextMetadata = {
          ...(alternateItem?.metadata ?? item.metadata),
        } as Record<string, unknown>;
        const posterPath = getTmdbPosterPath(url);
        if (posterPath && (item.type === 'movies' || item.type === 'tv')) {
          nextMetadata.poster_path = posterPath;
        }

        return {
          ...item,
          ...alternateItem,
          id: alternateItem?.id ?? item.id,
          type: alternateItem?.type ?? item.type,
          title: alternateItem?.title ?? item.title,
          subtitle: alternateItem?.subtitle ?? item.subtitle,
          year: alternateItem?.year ?? item.year,
          source: alternateItem?.source ?? item.source,
          coverUrl: alternateItem?.coverUrl ?? url,
          coverThumbnailUrl: alternateItem?.coverThumbnailUrl ?? url,
          alternateCoverItems: item.alternateCoverItems,
          alternateCoverUrls: item.alternateCoverUrls,
          metadata:
            Object.keys(nextMetadata).length > 0 ? nextMetadata : item.metadata,
        };
      });

      const updatedItem = updatedGrid.find(
        (item) => item.id === activePosterItemId,
      );

      logger.info(
        {
          context: 'GridOperations.handleSelectAlternatePoster',
          action: 'poster_applied',
          media: updatedItem
            ? { id: updatedItem.id, title: updatedItem.title }
            : null,
          url,
        },
        'POSTER: Applied alternate cover',
      );

      setGridItems(updatedGrid);
      setShowPosterGrid(false);
      setActivePosterItemId(null);
    },
    [
      activePosterItemId,
      gridItems,
      setGridItems,
      setShowPosterGrid,
      setActivePosterItemId,
    ],
  );

  const handleClosePosterGrid = useCallback(() => {
    logger.info(
      {
        context: 'GridOperations.handleClosePosterGrid',
        action: 'poster_grid_close',
        timestamp: Date.now(),
      },
      'POSTER: Closing alternate poster grid',
    );
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
      const selectedItem = gridItems.find((item) => item.id === mediaId);
      const selectedCoverUrl = selectedItem
        ? resolveCoverUrl(selectedItem)
        : null;
      try {
        const service = getMediaService(mediaType);
        const covers = await service.getAlternateCovers(mediaId);
        if (covers.length > 0) {
          setAlternateCoverUrls(mergeSelectedCover(covers, selectedCoverUrl));
          return;
        }
      } catch (err) {
        logger.error(
          {
            context: 'GridOperations.fetchAlternateCovers',
            mediaId,
            mediaType,
            error: err instanceof Error ? err.message : String(err),
          },
          'Failed to fetch alternate covers from API',
        );
      }

      if (storedCovers && storedCovers.length > 0) {
        setAlternateCoverUrls(
          mergeSelectedCover(storedCovers, selectedCoverUrl),
        );
      } else {
        setAlternateCoverUrls(selectedCoverUrl ? [selectedCoverUrl] : []);
      }
    },
    [gridItems, setAlternateCoverUrls],
  );

  const clearGrid = useCallback(() => {
    setGridItems([]);
    localStorage.removeItem('layout-section-open');
    localStorage.removeItem('status-section-open');
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
