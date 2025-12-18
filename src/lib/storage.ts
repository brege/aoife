/// <reference lib="dom" />
import { useEffect } from 'react';
import { getState, storeState } from './indexeddb';

export const GRID_STORAGE_KEY = 'gridItems';
export const COLUMNS_STORAGE_KEY = 'gridColumns';
export const MIN_ROWS_STORAGE_KEY = 'gridMinRows';
export const LAYOUT_DIMENSION_STORAGE_KEY = 'layoutDimension';
export const TITLE_STORAGE_KEY = 'gridTitle';
export const COVER_VIEW_STORAGE_KEY = 'coverViewMode';
export const INDEXEDDB_GRID_KEY = 'gridItems';
export const INDEXEDDB_COLUMNS_KEY = 'gridColumns';
export const INDEXEDDB_MIN_ROWS_KEY = 'gridMinRows';
export const INDEXEDDB_LAYOUT_DIMENSION_KEY = 'layoutDimension';
export const INDEXEDDB_TITLE_KEY = 'gridTitle';
export const DEFAULT_TITLE = 'aoife';

export const useStorageSync = (
  localStorageKey: string,
  indexedDbKey: string,
  value: string,
  isHydrated: boolean,
): void => {
  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    localStorage.setItem(localStorageKey, value);
    storeState(indexedDbKey, value);
  }, [value, isHydrated, localStorageKey, indexedDbKey]);
};

export const hydrateAppState = async (): Promise<{
  gridItems: string | null;
  columns: string | null;
  minRows: string | null;
  layoutDimension: string | null;
  title: string | null;
}> => {
  const storedColumns = await getState(INDEXEDDB_COLUMNS_KEY);
  const storedMinRows = await getState(INDEXEDDB_MIN_ROWS_KEY);
  const storedLayoutDimension = await getState(INDEXEDDB_LAYOUT_DIMENSION_KEY);
  const storedTitle = await getState(INDEXEDDB_TITLE_KEY);
  const storedGrid = await getState(INDEXEDDB_GRID_KEY);

  return {
    gridItems: storedGrid,
    columns: storedColumns,
    minRows: storedMinRows,
    layoutDimension: storedLayoutDimension,
    title: storedTitle,
  };
};

export const persistAppState = (
  gridItems: string,
  columns: string,
  minRows: string,
  layoutDimension: string,
  title: string,
): void => {
  localStorage.setItem(GRID_STORAGE_KEY, gridItems);
  localStorage.setItem(COLUMNS_STORAGE_KEY, columns);
  localStorage.setItem(MIN_ROWS_STORAGE_KEY, minRows);
  localStorage.setItem(LAYOUT_DIMENSION_STORAGE_KEY, layoutDimension);
  localStorage.setItem(TITLE_STORAGE_KEY, title);

  storeState(INDEXEDDB_GRID_KEY, gridItems);
  storeState(INDEXEDDB_COLUMNS_KEY, columns);
  storeState(INDEXEDDB_MIN_ROWS_KEY, minRows);
  storeState(INDEXEDDB_LAYOUT_DIMENSION_KEY, layoutDimension);
  storeState(INDEXEDDB_TITLE_KEY, title);
};
