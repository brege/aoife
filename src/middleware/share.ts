import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';

export type ShareStoreRecord = { payload: string; createdAt: number; title?: string };
export type ShareStore = Record<string, ShareStoreRecord>;

export type SharedStateItem = {
  id: string | number;
  type: string;
  title: string;
  subtitle?: string;
  year?: number;
  coverUrl?: string | null;
  coverThumbnailUrl?: string | null;
  source?: string;
  aspectRatio?: number;
};

export type SharedStatePayload = {
  gridItems: SharedStateItem[];
  columns: number;
  minRows: number;
  layoutDimension: 'width' | 'height';
};

const DATA_DIRECTORY_PATH = path.join(process.cwd(), 'data');
const SLUG_WORDS_PATH = path.join(DATA_DIRECTORY_PATH, 'slugs.json');
const SHARE_STORE_PATH = path.join(DATA_DIRECTORY_PATH, 'share.json');
const MAX_SHARE_PAYLOAD_BYTES = 200_000;
const MAX_SHARE_ITEMS = 24;
const MAX_ALTERNATE_COVERS = 32;

export const loadShareStore = (): ShareStore => {
  if (!fs.existsSync(SHARE_STORE_PATH)) {
    return {};
  }
  const contents = fs.readFileSync(SHARE_STORE_PATH, 'utf-8');
  const parsed = JSON.parse(contents);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Share store file is invalid');
  }
  return parsed as ShareStore;
};

export const isAllowedCoverUrl = (value: string): boolean => {
  if (value.startsWith('data:') || value.startsWith('blob:')) {
    return false;
  }

  if (value.startsWith('/api/gamesdb/images/')) {
    return true;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') {
    return false;
  }

  const host = parsed.hostname;
  if (host === 'image.tmdb.org') return true;
  if (host === 'covers.openlibrary.org') return true;
  if (host === 'coverartarchive.org') return true;
  if (host === 'mzstatic.com' || host.endsWith('.mzstatic.com')) return true;

  return false;
};

export const validateAndCanonicalizeSharePayload = (payload: string): string => {
  if (Buffer.byteLength(payload, 'utf-8') > MAX_SHARE_PAYLOAD_BYTES) {
    throw new Error('Share payload is too large');
  }

  const parsed = JSON.parse(payload) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Share payload must be a JSON object');
  }

  const raw = parsed as Record<string, unknown>;
  const gridItems = raw.gridItems;
  if (!Array.isArray(gridItems)) {
    throw new Error('Share payload gridItems must be a list');
  }
  if (gridItems.length > MAX_SHARE_ITEMS) {
    throw new Error('Share payload has too many items');
  }

  const columns = raw.columns;
  const minRows = raw.minRows;
  const layoutDimension = raw.layoutDimension;
  if (
    typeof columns !== 'number' ||
    !Number.isInteger(columns) ||
    columns < 1 ||
    columns > 8
  ) {
    throw new Error('Share payload columns is invalid');
  }
  if (
    typeof minRows !== 'number' ||
    !Number.isInteger(minRows) ||
    minRows < 1 ||
    minRows > 12
  ) {
    throw new Error('Share payload minRows is invalid');
  }
  if (layoutDimension !== 'width' && layoutDimension !== 'height') {
    throw new Error('Share payload layoutDimension is invalid');
  }

  const canonicalItems: SharedStateItem[] = [];

  for (const item of gridItems) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('Share payload gridItems entries must be objects');
    }
    const rawItem = item as Record<string, unknown>;

    const type = rawItem.type;
    if (type === 'custom') {
      throw new Error('Custom uploads cannot be shared');
    }
    if (typeof type !== 'string' || type.trim() === '') {
      throw new Error('Share payload item type is invalid');
    }

    const id = rawItem.id;
    if (typeof id !== 'string' && typeof id !== 'number') {
      throw new Error('Share payload item id is invalid');
    }

    const title = rawItem.title;
    if (typeof title !== 'string' || title.trim() === '') {
      throw new Error('Share payload item title is invalid');
    }

    const coverUrl = rawItem.coverUrl;
    if (coverUrl != null) {
      if (typeof coverUrl !== 'string' || !isAllowedCoverUrl(coverUrl)) {
        throw new Error('Share payload item coverUrl is not allowed');
      }
    }

    const coverThumbnailUrl = rawItem.coverThumbnailUrl;
    if (coverThumbnailUrl != null) {
      if (
        typeof coverThumbnailUrl !== 'string' ||
        !isAllowedCoverUrl(coverThumbnailUrl)
      ) {
        throw new Error('Share payload item coverThumbnailUrl is not allowed');
      }
    }

    const alternateCoverUrls = rawItem.alternateCoverUrls;
    if (alternateCoverUrls != null) {
      if (!Array.isArray(alternateCoverUrls)) {
        throw new Error('Share payload item alternateCoverUrls is invalid');
      }
      if (alternateCoverUrls.length > MAX_ALTERNATE_COVERS) {
        throw new Error('Share payload item alternateCoverUrls is too large');
      }
      for (const url of alternateCoverUrls) {
        if (typeof url !== 'string' || !isAllowedCoverUrl(url)) {
          throw new Error(
            'Share payload item alternateCoverUrls contains a disallowed URL',
          );
        }
      }
    }

    const subtitle = rawItem.subtitle;
    if (subtitle != null && typeof subtitle !== 'string') {
      throw new Error('Share payload item subtitle is invalid');
    }

    const year = rawItem.year;
    if (year != null && (typeof year !== 'number' || !Number.isInteger(year))) {
      throw new Error('Share payload item year is invalid');
    }

    const source = rawItem.source;
    if (source != null && typeof source !== 'string') {
      throw new Error('Share payload item source is invalid');
    }

    const aspectRatio = rawItem.aspectRatio;
    if (aspectRatio != null && typeof aspectRatio !== 'number') {
      throw new Error('Share payload item aspectRatio is invalid');
    }

    canonicalItems.push({
      id,
      type,
      title,
      subtitle: subtitle as string | undefined,
      year: year as number | undefined,
      coverUrl: coverUrl as string | null | undefined,
      coverThumbnailUrl: coverThumbnailUrl as string | null | undefined,
      source: source as string | undefined,
      aspectRatio: aspectRatio as number | undefined,
    });
  }

  const canonicalPayload: SharedStatePayload = {
    gridItems: canonicalItems,
    columns,
    minRows,
    layoutDimension,
  };

  return JSON.stringify(canonicalPayload);
};

export const loadSlugWords = (): string[] => {
  if (!fs.existsSync(SLUG_WORDS_PATH)) {
    throw new Error('Slug word list is missing');
  }
  const contents = fs.readFileSync(SLUG_WORDS_PATH, 'utf-8');
  const parsed = JSON.parse(contents);
  if (
    !Array.isArray(parsed) ||
    parsed.some((entry) => typeof entry !== 'string')
  ) {
    throw new Error('Slug word list is invalid');
  }
  if (parsed.length < 8) {
    throw new Error('Slug word list is too short');
  }
  return parsed;
};

export const persistShareStore = (store: ShareStore): void => {
  if (!fs.existsSync(DATA_DIRECTORY_PATH)) {
    throw new Error(`Missing data directory at ${DATA_DIRECTORY_PATH}`);
  }
  fs.writeFileSync(SHARE_STORE_PATH, JSON.stringify(store));
};

export const generateSlug = (existing: Set<string>, wordList: string[]): string => {
  for (let i = 0; i < 10; i += 1) {
    const slug = Array.from({ length: 3 })
      .map(() => wordList[crypto.randomInt(0, wordList.length)])
      .join('-');
    if (!existing.has(slug)) {
      return slug;
    }
  }
  throw new Error('Unable to generate unique share slug');
};
