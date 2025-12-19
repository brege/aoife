import { useEffect } from 'react';
import { GRID_STORAGE_KEY } from '../../lib/state/storage';
import type {
  MediaItem,
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
  setShowSearch: (enabled: boolean) => void;
  getShowSearch: () => boolean;
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
  showSearch: boolean;
  searchValues: MediaSearchValues;
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
  handleShowSearchToggle: (enabled: boolean) => void;
  handleClearGrid: () => void;
};

export const useSearchBridges = ({
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
}: SearchBridgesOptions) => {
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
      setShowSearch: handleShowSearchToggle,
      getShowSearch: () => showSearch,
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
    handleShowSearchToggle,
    handleClearGrid,
    handleRemoveMedia,
    showSearch,
    layoutDimension,
    runSearch,
    searchValues,
    selectedMediaType,
    setLayoutDimension,
    setSelectedMediaType,
  ]);
};
