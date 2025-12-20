import { useEffect, useState } from 'react';
import {
  BAND_PLACEMENT_STORAGE_KEY,
  CAPTION_EDITS_ONLY_STORAGE_KEY,
  CAPTION_MODE_STORAGE_KEY,
  COLUMNS_STORAGE_KEY,
  COVER_VIEW_STORAGE_KEY,
  INDEXEDDB_CAPTION_EDITS_ONLY_KEY,
  INDEXEDDB_CAPTION_MODE_KEY,
  INDEXEDDB_COLUMNS_KEY,
  INDEXEDDB_LAYOUT_DIMENSION_KEY,
  INDEXEDDB_MIN_ROWS_KEY,
  LAYOUT_DIMENSION_STORAGE_KEY,
  MIN_ROWS_STORAGE_KEY,
  useStorageSync,
} from './storage';

type UseLayoutStateOptions = {
  isHydrated: boolean;
};

export type UseLayoutStateReturn = {
  columns: number;
  setColumns: (value: number) => void;
  minRows: number;
  setMinRows: (value: number) => void;
  layoutDimension: 'width' | 'height';
  setLayoutDimension: (value: 'width' | 'height') => void;
  coverViewMode: 'grid' | 'carousel';
  setCoverViewMode: (value: 'grid' | 'carousel') => void;
  bandPlacementMode: 'alwaysTop' | 'adaptive';
  setBandPlacementMode: (value: 'alwaysTop' | 'adaptive') => void;
  captionMode: 'hidden' | 'top' | 'bottom';
  setCaptionMode: (value: 'hidden' | 'top' | 'bottom') => void;
  captionEditsOnly: boolean;
  setCaptionEditsOnly: (value: boolean) => void;
};

export const useLayoutState = (
  options: UseLayoutStateOptions,
): UseLayoutStateReturn => {
  const { isHydrated } = options;
  const parseStoredNumber = (
    value: string | null,
    minimum: number,
    maximum: number,
  ): number | null => {
    if (!value) {
      return null;
    }
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < minimum || parsed > maximum) {
      return null;
    }
    return parsed;
  };

  const [columns, setColumns] = useState(() => {
    return (
      parseStoredNumber(localStorage.getItem(COLUMNS_STORAGE_KEY), 1, 8) ?? 4
    );
  });

  const [minRows, setMinRows] = useState(() => {
    return (
      parseStoredNumber(localStorage.getItem(MIN_ROWS_STORAGE_KEY), 1, 6) ?? 2
    );
  });

  const [layoutDimension, setLayoutDimension] = useState<'width' | 'height'>(
    () => {
      const stored = localStorage.getItem(LAYOUT_DIMENSION_STORAGE_KEY);
      if (stored === 'width' || stored === 'height') {
        return stored;
      }
      return 'height';
    },
  );

  const [coverViewMode, setCoverViewMode] = useState<'grid' | 'carousel'>(
    () => {
      const stored = localStorage.getItem(COVER_VIEW_STORAGE_KEY);
      if (stored === 'carousel') {
        return 'carousel';
      }
      return 'grid';
    },
  );

  const [bandPlacementMode, setBandPlacementMode] = useState<
    'alwaysTop' | 'adaptive'
  >(() => {
    const stored = localStorage.getItem(BAND_PLACEMENT_STORAGE_KEY);
    if (stored === 'alwaysTop') {
      return 'alwaysTop';
    }
    return 'adaptive';
  });

  const storedCaptionMode = localStorage.getItem(CAPTION_MODE_STORAGE_KEY);

  const [captionMode, setCaptionMode] = useState<'hidden' | 'top' | 'bottom'>(
    () => {
      const stored = localStorage.getItem(CAPTION_MODE_STORAGE_KEY);
      if (stored === 'hidden' || stored === 'top' || stored === 'bottom') {
        return stored;
      }
      if (stored === 'edits') {
        return 'bottom';
      }
      return 'top';
    },
  );

  const [captionEditsOnly, setCaptionEditsOnly] = useState<boolean>(() => {
    const stored = localStorage.getItem(CAPTION_EDITS_ONLY_STORAGE_KEY);
    if (stored === 'true') {
      return true;
    }
    if (stored === 'false') {
      return false;
    }
    return storedCaptionMode === 'edits';
  });

  useStorageSync(
    COLUMNS_STORAGE_KEY,
    INDEXEDDB_COLUMNS_KEY,
    String(columns),
    isHydrated,
  );

  useStorageSync(
    MIN_ROWS_STORAGE_KEY,
    INDEXEDDB_MIN_ROWS_KEY,
    String(minRows),
    isHydrated,
  );

  useStorageSync(
    LAYOUT_DIMENSION_STORAGE_KEY,
    INDEXEDDB_LAYOUT_DIMENSION_KEY,
    layoutDimension,
    isHydrated,
  );

  useEffect(() => {
    localStorage.setItem(COVER_VIEW_STORAGE_KEY, coverViewMode);
  }, [coverViewMode]);

  useEffect(() => {
    localStorage.setItem(BAND_PLACEMENT_STORAGE_KEY, bandPlacementMode);
  }, [bandPlacementMode]);

  useStorageSync(
    CAPTION_MODE_STORAGE_KEY,
    INDEXEDDB_CAPTION_MODE_KEY,
    captionMode,
    isHydrated,
  );

  useStorageSync(
    CAPTION_EDITS_ONLY_STORAGE_KEY,
    INDEXEDDB_CAPTION_EDITS_ONLY_KEY,
    String(captionEditsOnly),
    isHydrated,
  );

  return {
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
  };
};
