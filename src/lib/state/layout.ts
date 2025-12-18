import { useEffect, useState } from 'react';
import {
  COLUMNS_STORAGE_KEY,
  COVER_VIEW_STORAGE_KEY,
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
};

export const useLayoutState = (
  options: UseLayoutStateOptions,
): UseLayoutStateReturn => {
  const { isHydrated } = options;
  const [columns, setColumns] = useState(() => {
    const stored = localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 8) {
        return parsed;
      }
    }
    return 4;
  });

  const [minRows, setMinRows] = useState(() => {
    const stored = localStorage.getItem(MIN_ROWS_STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 6) {
        return parsed;
      }
    }
    return 2;
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

  return {
    columns,
    setColumns,
    minRows,
    setMinRows,
    layoutDimension,
    setLayoutDimension,
    coverViewMode,
    setCoverViewMode,
  };
};
