import { useCallback, useEffect } from 'react';
import { type CliMenuState, useCliBridge } from '../../lib/api';
import logger from '../../lib/logger';
import { GRID_STORAGE_KEY } from '../../lib/state/storage';
import { getMediaProvider } from '../../media/providers';
import type {
  MediaItem,
  MediaProviderConfig,
  MediaSearchValues,
  MediaType,
} from '../../media/types';

type LayoutDimension = 'width' | 'height';

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
  setLayoutDimension: (dimension: LayoutDimension) => void;
  getLayoutDimension: () => LayoutDimension;
};

type WindowWithTestApi = Window & {
  appTestApi?: TestApplicationApi;
  gridDebugInfo?: unknown;
};

type SearchBridgesOptions = {
  gridItems: MediaItem[];
  gridCapacity: number;
  columns: number;
  isBuilderMode: boolean;
  searchValues: MediaSearchValues;
  provider: MediaProviderConfig;
  selectedMediaType: MediaType;
  layoutDimension: LayoutDimension;
  runSearch: (
    values: Partial<MediaSearchValues>,
    mediaType?: MediaType,
  ) => Promise<MediaItem[]>;
  setSelectedMediaType: (mediaType: MediaType) => void;
  setLayoutDimension: (dimension: LayoutDimension) => void;
  handleAddMedia: (media: MediaItem, availableCovers?: MediaItem[]) => void;
  handleRemoveMedia: (mediaId: string | number) => void;
  clearGridAndPersist: (source: string) => void;
  handleBuilderModeToggle: (enabled: boolean) => void;
  handleClearGrid: () => void;
};

export const useSearchBridges = ({
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
}: SearchBridgesOptions) => {
  const handleCliSearch = useCallback(
    async (query: string, mediaType?: string) => {
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
      await runSearch(nextValues);
    },
    [runSearch, selectedMediaType, setSelectedMediaType],
  );

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
    clearGridAndPersist('CLI-CLEAR: Grid cleared via CLI command');
  }, [clearGridAndPersist]);

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
      maxGridCapacity: gridCapacity,
    };

    logger.info('MENU: State requested via CLI', {
      context: 'MediaSearch.handleGetMenuState',
      action: 'menu_state_requested',
      menuState,
      timestamp: Date.now(),
    });

    return menuState;
  }, [gridCapacity, gridItems.length, isBuilderMode]);

  const handleMenuClearGrid = useCallback(() => {
    clearGridAndPersist('CLI-MENU-CLEAR: Grid cleared via CLI menu command');
  }, [clearGridAndPersist]);

  const handleGetDebugInfo = useCallback(() => {
    const windowWithTestApi = window as WindowWithTestApi;
    const debugInfo = windowWithTestApi.gridDebugInfo ?? {
      error: 'No debug info available',
    };
    return debugInfo;
  }, []);

  const handleCliAddFirstResult = useCallback(
    async (query: string) => {
      if (!query) return;
      const primaryFieldId = provider.searchFields[0]?.id ?? 'query';
      const nextValues = {
        ...provider.defaultSearchValues,
        ...searchValues,
        [primaryFieldId]: query,
      };
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
    },
    [
      handleAddMedia,
      provider.defaultSearchValues,
      provider.searchFields,
      runSearch,
      searchValues,
    ],
  );

  const handleCliGetGridState = useCallback(() => {
    const gridState = {
      count: gridItems.length,
      maxCapacity: gridCapacity,
      positions: gridItems.map((item, index) => ({
        position: index,
        gridPosition:
          columns > 0
            ? `(${Math.floor(index / columns)}, ${index % columns})`
            : null,
        media: {
          id: item.id,
          title: item.title,
          year: item.year,
        },
      })),
      emptyPositions: Array.from(
        { length: gridCapacity - gridItems.length },
        (_, index) => ({
          position: gridItems.length + index,
          gridPosition:
            columns > 0
              ? `(${Math.floor((gridItems.length + index) / columns)}, ${(gridItems.length + index) % columns})`
              : null,
        }),
      ),
    };

    logger.info(
      `CLI-GRID: Grid state requested - ${gridItems.length}/${gridCapacity} positions filled`,
      {
        context: 'MediaSearch.handleCliGetGridState',
        action: 'cli_grid_state',
        gridState,
        timestamp: Date.now(),
      },
    );

    return gridState;
  }, [columns, gridCapacity, gridItems]);

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

  useEffect(() => {
    const windowWithTestApi = window as WindowWithTestApi;

    const testApi: TestApplicationApi = {
      setMediaType: (mediaType) => {
        setSelectedMediaType(mediaType);
      },
      search: (values, mediaType) =>
        runSearch(values ?? {}, mediaType ?? selectedMediaType),
      applySearchResults: () => {},
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
      setLayoutDimension: (dimension) => setLayoutDimension(dimension),
      getLayoutDimension: () => layoutDimension,
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
    layoutDimension,
    runSearch,
    searchValues,
    selectedMediaType,
    setLayoutDimension,
    setSelectedMediaType,
  ]);
};
