import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MediaItem } from '../../media/types';
import { storeState } from '../indexeddb';
import logger from '../logger';
import {
  buildSharePayload,
  createShare,
  INDEXEDDB_SHARE_PREFIX,
  loadShare,
  SHARE_QUERY_PARAM,
  type SharedState,
} from '../share';
import {
  DEFAULT_TITLE,
  GRID_STORAGE_KEY,
  hydrateAppState,
  persistAppState,
  TITLE_STORAGE_KEY,
} from './storage';

type LayoutDimension = 'width' | 'height';

type UseShareStateOptions = {
  columns: number;
  minRows: number;
  layoutDimension: LayoutDimension;
  gridItems: MediaItem[];
  title: string;
  isHydrated: boolean;
  setColumns: (value: number) => void;
  setMinRows: (value: number) => void;
  setLayoutDimension: (value: LayoutDimension) => void;
  setGridItems: (value: MediaItem[]) => void;
  setTitle: (value: string) => void;
  setIsHydrated: (value: boolean) => void;
};

type UseShareStateReturn = {
  shareUrl: string;
  shareError: string;
  isSharing: boolean;
  isLoadingShare: boolean;
  handleCreateShare: () => Promise<void>;
  resetShareContext: () => void;
};

export const useShareState = (
  options: UseShareStateOptions,
): UseShareStateReturn => {
  const {
    columns,
    minRows,
    layoutDimension,
    gridItems,
    title,
    isHydrated,
    setColumns,
    setMinRows,
    setLayoutDimension,
    setGridItems,
    setTitle,
    setIsHydrated,
  } = options;

  const [shareUrl, setShareUrl] = useState('');
  const [shareError, setShareError] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [isLoadingShare, setIsLoadingShare] = useState(false);

  const initialShareSlugRef = useRef<string | null>(null);
  if (initialShareSlugRef.current === null) {
    const params = new URLSearchParams(window.location.search);
    initialShareSlugRef.current = params.get(SHARE_QUERY_PARAM);
  }

  const applySharedState = useCallback(
    (state: SharedState, slug: string, sharedTitle: string) => {
      const nextTitle = sharedTitle.trim() === '' ? DEFAULT_TITLE : sharedTitle;
      setColumns(state.columns);
      setMinRows(state.minRows);
      setLayoutDimension(state.layoutDimension);
      setGridItems(state.gridItems);
      setTitle(nextTitle);
      persistAppState(
        JSON.stringify(state.gridItems),
        String(state.columns),
        String(state.minRows),
        state.layoutDimension,
        nextTitle,
      );

      const url = new URL(window.location.href);
      url.searchParams.set(SHARE_QUERY_PARAM, slug);
      window.history.replaceState(null, '', url.toString());
      setShareUrl(url.toString());
    },
    [setColumns, setGridItems, setLayoutDimension, setMinRows, setTitle],
  );

  const handleLoadShare = useCallback(
    async (slug: string) => {
      setIsLoadingShare(true);
      setShareError('');
      try {
        const result = await loadShare(slug, DEFAULT_TITLE);
        applySharedState(result.state, result.slug, result.title);
        logger.info('SHARE: Loaded shared grid', {
          context: 'useShareState.handleLoadShare',
          action: 'share_load',
          slug,
          timestamp: Date.now(),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setShareError(message);
        logger.error('SHARE: Failed to load shared grid', {
          context: 'useShareState.handleLoadShare',
          slug,
          error: message,
        });
      } finally {
        setIsLoadingShare(false);
      }
    },
    [applySharedState],
  );

  const initialShareSlug = useMemo(() => initialShareSlugRef.current, []);

  useEffect(() => {
    if (initialShareSlug) {
      setIsHydrated(true);
      return;
    }

    const stored = localStorage.getItem(GRID_STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as MediaItem[];
      if (Array.isArray(parsed)) {
        setGridItems(parsed);
      }
    } catch (storageError) {
      logger.error('Failed to parse stored grid items', {
        context: 'useShareState.storageLoad',
        error:
          storageError instanceof Error
            ? storageError.message
            : String(storageError),
      });
    }
  }, [initialShareSlug, setGridItems, setIsHydrated]);

  useEffect(() => {
    if (initialShareSlug) {
      setIsHydrated(true);
      return;
    }

    void (async () => {
      const state = await hydrateAppState();

      if (state.columns) {
        const parsed = parseInt(state.columns, 10);
        if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 8) {
          setColumns(parsed);
        }
      }

      if (state.minRows) {
        const parsed = parseInt(state.minRows, 10);
        if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 6) {
          setMinRows(parsed);
        }
      }

      if (
        state.layoutDimension === 'width' ||
        state.layoutDimension === 'height'
      ) {
        setLayoutDimension(state.layoutDimension);
      }

      if (state.title && localStorage.getItem(TITLE_STORAGE_KEY) === null) {
        setTitle(state.title.trim() === '' ? DEFAULT_TITLE : state.title);
      }

      if (state.gridItems) {
        const storedLocalGrid = localStorage.getItem(GRID_STORAGE_KEY);
        if (storedLocalGrid === null) {
          const parsedGrid = JSON.parse(state.gridItems) as MediaItem[];
          if (Array.isArray(parsedGrid)) {
            setGridItems(parsedGrid);
          }
        }
      }
    })().finally(() => {
      setIsHydrated(true);
    });
  }, [
    initialShareSlug,
    setColumns,
    setGridItems,
    setIsHydrated,
    setLayoutDimension,
    setMinRows,
    setTitle,
  ]);

  useEffect(() => {
    if (!initialShareSlug) {
      return;
    }
    handleLoadShare(initialShareSlug);
  }, [handleLoadShare, initialShareSlug]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    persistAppState(
      JSON.stringify(gridItems),
      String(columns),
      String(minRows),
      layoutDimension,
      title,
    );
  }, [columns, gridItems, isHydrated, layoutDimension, minRows, title]);

  const handleCreateShare = useCallback(async () => {
    if (gridItems.length === 0) {
      setShareError('Add at least one item before sharing.');
      return;
    }

    setIsSharing(true);
    setShareError('');

    try {
      const shareState: SharedState = {
        gridItems,
        columns,
        minRows,
        layoutDimension,
      };
      const payload = buildSharePayload(shareState);
      const response = await createShare(payload, title);
      await storeState(
        `${INDEXEDDB_SHARE_PREFIX}${response.slug}`,
        JSON.stringify({ payload, title }),
      );
      const url = new URL(window.location.href);
      url.searchParams.set(SHARE_QUERY_PARAM, response.slug);
      window.history.replaceState(null, '', url.toString());
      setShareUrl(url.toString());

      logger.info('SHARE: Created share link', {
        context: 'useShareState.handleCreateShare',
        action: 'share_created',
        slug: response.slug,
        gridCount: gridItems.length,
        columns,
        minRows,
        layoutDimension,
        timestamp: Date.now(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setShareError(message);
      logger.error('SHARE: Failed to create share link', {
        context: 'useShareState.handleCreateShare',
        action: 'share_create_failed',
        error: message,
      });
    } finally {
      setIsSharing(false);
    }
  }, [columns, gridItems, layoutDimension, minRows, title]);

  const resetShareContext = useCallback(() => {
    setShareError('');
    setShareUrl('');
    setTitle(DEFAULT_TITLE);

    const url = new URL(window.location.href);
    url.searchParams.delete(SHARE_QUERY_PARAM);
    window.history.replaceState(null, '', url.toString());
  }, [setTitle]);

  return {
    shareUrl,
    shareError,
    isSharing,
    isLoadingShare,
    handleCreateShare,
    resetShareContext,
  };
};
