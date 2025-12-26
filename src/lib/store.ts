import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MediaItem, MediaType } from '../providers/types';
import { storeState } from './indexeddb';
import logger from './logger';
import {
  buildSharePayload,
  createShare,
  INDEXEDDB_SHARE_PREFIX,
  loadShare,
  SHARE_QUERY_PARAM,
  type SharedState,
} from './share';

const DEFAULT_TITLE = 'aoife';

type LayoutState = {
  columns: number;
  minRows: number;
  layoutDimension: 'width' | 'height';
  coverViewMode: 'grid' | 'carousel';
  bandPlacementMode: 'alwaysTop' | 'adaptive';
  captionMode: 'hidden' | 'top' | 'bottom';
  captionEditsOnly: boolean;
};

type SearchUiState = {
  selectedMediaType: MediaType;
  brokenSearchResultIds: Record<string | number, true>;
  searchResultAspectRatios: Record<string | number, number>;
  lastSearchSummary: string;
  friendlyError: string;
};

type GridState = {
  gridItems: MediaItem[];
  title: string;
};

type UiState = {
  showSearch: boolean;
  visibleResultsCount: number;
  showPosterGrid: boolean;
  showCoverLinkModal: boolean;
  showCaptionModal: boolean;
  coverLinkMediaType: MediaType;
  activePosterItemId: string | number | null;
  activeCaptionItemId: string | number | null;
  alternateCoverUrls: string[];
  brokenAlternateCoverUrls: Record<string, true>;
};

type ShareState = {
  shareUrl: string;
  shareError: string;
  isSharing: boolean;
  isLoadingShare: boolean;
  shareSnapshot: string | null;
};

type HydrationState = {
  isHydrated: boolean;
};

type LayoutActions = {
  setColumns: (value: number) => void;
  setMinRows: (value: number) => void;
  setLayoutDimension: (value: 'width' | 'height') => void;
  setCoverViewMode: (value: 'grid' | 'carousel') => void;
  setBandPlacementMode: (value: 'alwaysTop' | 'adaptive') => void;
  setCaptionMode: (value: 'hidden' | 'top' | 'bottom') => void;
  setCaptionEditsOnly: (value: boolean) => void;
};

type SearchUiActions = {
  setSelectedMediaType: (value: MediaType) => void;
  setBrokenSearchResultId: (id: string | number) => void;
  setSearchResultAspectRatio: (id: string | number, ratio: number) => void;
  setLastSearchSummary: (value: string) => void;
  setFriendlyError: (value: string) => void;
  resetSearchUi: () => void;
};

type GridActions = {
  setGridItems: (
    items: MediaItem[] | ((current: MediaItem[]) => MediaItem[]),
  ) => void;
  setTitle: (value: string) => void;
  clearGrid: () => void;
};

type UiActions = {
  setShowSearch: (value: boolean) => void;
  setVisibleResultsCount: (value: number) => void;
  incrementVisibleResultsCount: (step: number) => void;
  setShowPosterGrid: (value: boolean) => void;
  setShowCoverLinkModal: (value: boolean) => void;
  setShowCaptionModal: (value: boolean) => void;
  setCoverLinkMediaType: (value: MediaType) => void;
  setActivePosterItemId: (value: string | number | null) => void;
  setActiveCaptionItemId: (value: string | number | null) => void;
  setAlternateCoverUrls: (urls: string[]) => void;
  setBrokenAlternateCoverUrl: (url: string) => void;
  resetBrokenAlternateCoverUrls: () => void;
};

type ShareActions = {
  handleCreateShare: () => Promise<void>;
  handleLoadShare: (slug: string) => Promise<void>;
  resetShareContext: () => void;
  checkShareDivergence: () => void;
};

type HydrationActions = {
  setIsHydrated: (value: boolean) => void;
  hydrateFromStorage: () => Promise<void>;
};

export type AppStore = LayoutState &
  SearchUiState &
  GridState &
  UiState &
  ShareState &
  HydrationState &
  LayoutActions &
  SearchUiActions &
  GridActions &
  UiActions &
  ShareActions &
  HydrationActions;

const buildShareSnapshot = (state: {
  gridItems: MediaItem[];
  columns: number;
  minRows: number;
  layoutDimension: 'width' | 'height';
  title: string;
}): string => {
  return JSON.stringify({
    gridItems: state.gridItems,
    columns: state.columns,
    minRows: state.minRows,
    layoutDimension: state.layoutDimension,
    title: state.title,
  });
};

const constrainNumber = (
  value: number,
  minimum: number,
  maximum: number,
  fallback: number,
): number => {
  if (Number.isNaN(value) || value < minimum || value > maximum) {
    return fallback;
  }
  return value;
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      columns: 4,
      minRows: 2,
      layoutDimension: 'height',
      coverViewMode: 'grid',
      bandPlacementMode: 'adaptive',
      captionMode: 'top',
      captionEditsOnly: false,

      selectedMediaType: 'movies',
      brokenSearchResultIds: {},
      searchResultAspectRatios: {},
      lastSearchSummary: '',
      friendlyError: '',

      gridItems: [],
      title: DEFAULT_TITLE,

      showSearch: true,
      visibleResultsCount: 12,
      showPosterGrid: false,
      showCoverLinkModal: false,
      showCaptionModal: false,
      coverLinkMediaType: 'books',
      activePosterItemId: null,
      activeCaptionItemId: null,
      alternateCoverUrls: [],
      brokenAlternateCoverUrls: {},

      shareUrl: '',
      shareError: '',
      isSharing: false,
      isLoadingShare: false,
      shareSnapshot: null,

      isHydrated: false,

      setColumns: (value) => set({ columns: constrainNumber(value, 1, 8, 4) }),
      setMinRows: (value) => set({ minRows: constrainNumber(value, 1, 6, 2) }),
      setLayoutDimension: (value) => set({ layoutDimension: value }),
      setCoverViewMode: (value) => set({ coverViewMode: value }),
      setBandPlacementMode: (value) => set({ bandPlacementMode: value }),
      setCaptionMode: (value) => set({ captionMode: value }),
      setCaptionEditsOnly: (value) => set({ captionEditsOnly: value }),

      setSelectedMediaType: (value) => set({ selectedMediaType: value }),
      setBrokenSearchResultId: (id) =>
        set((state) => ({
          brokenSearchResultIds: {
            ...state.brokenSearchResultIds,
            [id]: true as const,
          },
        })),
      setSearchResultAspectRatio: (id, ratio) =>
        set((state) => ({
          searchResultAspectRatios: {
            ...state.searchResultAspectRatios,
            [id]: ratio,
          },
        })),
      setLastSearchSummary: (value) => set({ lastSearchSummary: value }),
      setFriendlyError: (value) => set({ friendlyError: value }),
      resetSearchUi: () =>
        set({
          brokenSearchResultIds: {},
          searchResultAspectRatios: {},
          friendlyError: '',
        }),

      setGridItems: (itemsOrUpdater) =>
        set((state) => ({
          gridItems:
            typeof itemsOrUpdater === 'function'
              ? itemsOrUpdater(state.gridItems)
              : itemsOrUpdater,
        })),
      setTitle: (value) => {
        const normalized = value.trim() === '' ? DEFAULT_TITLE : value.trim();
        set({ title: normalized });
      },
      clearGrid: () => {
        set({ gridItems: [], title: DEFAULT_TITLE });
        localStorage.removeItem('layout-section-open');
        localStorage.removeItem('status-section-open');
      },

      setShowSearch: (value) => set({ showSearch: value }),
      setVisibleResultsCount: (value) => set({ visibleResultsCount: value }),
      incrementVisibleResultsCount: (step) =>
        set((state) => ({
          visibleResultsCount: state.visibleResultsCount + step,
        })),
      setShowPosterGrid: (value) => set({ showPosterGrid: value }),
      setShowCoverLinkModal: (value) => set({ showCoverLinkModal: value }),
      setShowCaptionModal: (value) => set({ showCaptionModal: value }),
      setCoverLinkMediaType: (value) => set({ coverLinkMediaType: value }),
      setActivePosterItemId: (value) => set({ activePosterItemId: value }),
      setActiveCaptionItemId: (value) => set({ activeCaptionItemId: value }),
      setAlternateCoverUrls: (urls) => set({ alternateCoverUrls: urls }),
      setBrokenAlternateCoverUrl: (url) =>
        set((state) => ({
          brokenAlternateCoverUrls: {
            ...state.brokenAlternateCoverUrls,
            [url]: true as const,
          },
        })),
      resetBrokenAlternateCoverUrls: () =>
        set({ brokenAlternateCoverUrls: {} }),

      handleCreateShare: async () => {
        const state = get();
        if (state.gridItems.length === 0) {
          set({ shareError: 'Add at least one item before sharing.' });
          return;
        }

        set({ isSharing: true, shareError: '' });

        try {
          const shareState: SharedState = {
            gridItems: state.gridItems,
            columns: state.columns,
            minRows: state.minRows,
            layoutDimension: state.layoutDimension,
          };
          const payload = buildSharePayload(shareState);
          const response = await createShare(payload, state.title);
          await storeState(
            `${INDEXEDDB_SHARE_PREFIX}${response.slug}`,
            JSON.stringify({ payload, title: state.title }),
          );
          const snapshot = buildShareSnapshot({
            gridItems: state.gridItems,
            columns: state.columns,
            minRows: state.minRows,
            layoutDimension: state.layoutDimension,
            title: state.title,
          });
          const url = new URL(window.location.href);
          url.searchParams.set(SHARE_QUERY_PARAM, response.slug);
          window.history.replaceState(null, '', url.toString());
          set({ shareUrl: url.toString(), shareSnapshot: snapshot });

          logger.info(
            {
              context: 'AppStore.handleCreateShare',
              action: 'share_created',
              slug: response.slug,
              gridCount: state.gridItems.length,
              columns: state.columns,
              minRows: state.minRows,
              layoutDimension: state.layoutDimension,
              timestamp: Date.now(),
            },
            'SHARE: Created share link',
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          set({ shareError: message });
          logger.error(
            {
              context: 'AppStore.handleCreateShare',
              action: 'share_create_failed',
              error: message,
            },
            'SHARE: Failed to create share link',
          );
        } finally {
          set({ isSharing: false });
        }
      },

      handleLoadShare: async (slug) => {
        set({ isLoadingShare: true, shareError: '' });
        try {
          const result = await loadShare(slug, DEFAULT_TITLE);
          const nextTitle =
            result.title.trim() === '' ? DEFAULT_TITLE : result.title;
          set({
            columns: result.state.columns,
            minRows: result.state.minRows,
            layoutDimension: result.state.layoutDimension,
            gridItems: result.state.gridItems,
            title: nextTitle,
          });

          const url = new URL(window.location.href);
          url.searchParams.set(SHARE_QUERY_PARAM, result.slug);
          window.history.replaceState(null, '', url.toString());

          const snapshot = buildShareSnapshot({
            gridItems: result.state.gridItems,
            columns: result.state.columns,
            minRows: result.state.minRows,
            layoutDimension: result.state.layoutDimension,
            title: nextTitle,
          });
          set({ shareUrl: url.toString(), shareSnapshot: snapshot });

          logger.info(
            {
              context: 'AppStore.handleLoadShare',
              action: 'share_load',
              slug,
              timestamp: Date.now(),
            },
            'SHARE: Loaded shared grid',
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          set({ shareError: message });
          logger.error(
            {
              context: 'AppStore.handleLoadShare',
              slug,
              error: message,
            },
            'SHARE: Failed to load shared grid',
          );
        } finally {
          set({ isLoadingShare: false, isHydrated: true });
        }
      },

      resetShareContext: () => {
        set({
          shareError: '',
          shareUrl: '',
          title: DEFAULT_TITLE,
          shareSnapshot: null,
        });
        const url = new URL(window.location.href);
        url.searchParams.delete(SHARE_QUERY_PARAM);
        window.history.replaceState(null, '', url.toString());
      },

      checkShareDivergence: () => {
        const state = get();
        if (!state.isHydrated || !state.shareUrl || !state.shareSnapshot) {
          return;
        }
        const currentSnapshot = buildShareSnapshot({
          gridItems: state.gridItems,
          columns: state.columns,
          minRows: state.minRows,
          layoutDimension: state.layoutDimension,
          title: state.title,
        });
        if (currentSnapshot !== state.shareSnapshot) {
          set({ shareSnapshot: null, shareError: '', shareUrl: '' });
          const url = new URL(window.location.href);
          url.searchParams.delete(SHARE_QUERY_PARAM);
          window.history.replaceState(null, '', url.toString());
        }
      },

      setIsHydrated: (value) => set({ isHydrated: value }),

      hydrateFromStorage: async () => {
        const params = new URLSearchParams(window.location.search);
        const shareSlug = params.get(SHARE_QUERY_PARAM);
        if (shareSlug) {
          await get().handleLoadShare(shareSlug);
          return;
        }
        set({ isHydrated: true });
      },
    }),
    {
      name: 'aoife-store',
      version: 1,
      partialize: (state) => ({
        columns: state.columns,
        minRows: state.minRows,
        layoutDimension: state.layoutDimension,
        coverViewMode: state.coverViewMode,
        bandPlacementMode: state.bandPlacementMode,
        captionMode: state.captionMode,
        captionEditsOnly: state.captionEditsOnly,
        selectedMediaType: state.selectedMediaType,
        gridItems: state.gridItems,
        title: state.title,
      }),
      migrate: (persisted, version) => {
        if (version === 0 || persisted === null) {
          const migrated: Record<string, unknown> = {};

          const gridItems = localStorage.getItem('gridItems');
          if (gridItems) {
            try {
              migrated.gridItems = JSON.parse(gridItems);
            } catch {
              migrated.gridItems = [];
            }
          }

          const columns = localStorage.getItem('gridColumns');
          if (columns) {
            const parsed = parseInt(columns, 10);
            if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 8) {
              migrated.columns = parsed;
            }
          }

          const minRows = localStorage.getItem('gridMinRows');
          if (minRows) {
            const parsed = parseInt(minRows, 10);
            if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 6) {
              migrated.minRows = parsed;
            }
          }

          const layoutDimension = localStorage.getItem('layoutDimension');
          if (layoutDimension === 'width' || layoutDimension === 'height') {
            migrated.layoutDimension = layoutDimension;
          }

          const coverViewMode = localStorage.getItem('coverViewMode');
          if (coverViewMode === 'grid' || coverViewMode === 'carousel') {
            migrated.coverViewMode = coverViewMode;
          }

          const bandPlacementMode = localStorage.getItem('searchBandPlacement');
          if (
            bandPlacementMode === 'alwaysTop' ||
            bandPlacementMode === 'adaptive'
          ) {
            migrated.bandPlacementMode = bandPlacementMode;
          }

          const captionMode = localStorage.getItem('gridCaptionMode');
          if (
            captionMode === 'hidden' ||
            captionMode === 'top' ||
            captionMode === 'bottom'
          ) {
            migrated.captionMode = captionMode;
          }

          const captionEditsOnly = localStorage.getItem('gridCaptionEditsOnly');
          if (captionEditsOnly === 'true') {
            migrated.captionEditsOnly = true;
          } else if (captionEditsOnly === 'false') {
            migrated.captionEditsOnly = false;
          }

          const selectedMediaType = localStorage.getItem('selectedMediaType');
          if (
            selectedMediaType === 'movies' ||
            selectedMediaType === 'tv' ||
            selectedMediaType === 'books' ||
            selectedMediaType === 'music' ||
            selectedMediaType === 'games' ||
            selectedMediaType === 'custom'
          ) {
            migrated.selectedMediaType = selectedMediaType;
          }

          const title = localStorage.getItem('gridTitle');
          if (title) {
            migrated.title = title.trim() === '' ? DEFAULT_TITLE : title;
          }

          return migrated;
        }
        return persisted;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          const params = new URLSearchParams(window.location.search);
          const shareSlug = params.get(SHARE_QUERY_PARAM);
          if (shareSlug) {
            state.handleLoadShare(shareSlug);
          } else {
            state.setIsHydrated(true);
          }
        }
      },
    },
  ),
);
