import type { MediaItem } from '../providers/types';
import { getState, storeState } from './indexeddb';

type ShareCreateResponse = {
  slug: string;
  id: string;
};

type ShareFetchResponse = {
  slug: string;
  payload: string;
  title?: string;
};

export type SharedState = {
  gridItems: MediaItem[];
  columns: number;
  minRows: number;
  layoutDimension: 'height' | 'chimney';
  captionMode: 'hidden' | 'top' | 'bottom';
  captionEditsOnly: boolean;
};

type ShareCacheRecord = {
  payload: string;
  title?: string;
};

export const SHARE_QUERY_PARAM = 'share';
export const INDEXEDDB_SHARE_PREFIX = 'share:';

const parseErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = await response.json();
    const message =
      typeof body?.error === 'string'
        ? body.error
        : `Request failed with status ${response.status}`;
    return message;
  } catch {
    return `Request failed with status ${response.status}`;
  }
};

export const createShare = async (
  payload: string,
  title: string,
): Promise<ShareCreateResponse> => {
  if (typeof payload !== 'string' || payload.trim() === '') {
    throw new Error('Share payload must be a non-empty string');
  }
  if (typeof title !== 'string' || title.trim() === '') {
    throw new Error('Share title must be a non-empty string');
  }

  const response = await fetch('/api/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload, title }),
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(message);
  }

  const data = (await response.json()) as ShareCreateResponse;
  if (!data?.slug) {
    throw new Error('Share response missing slug');
  }

  return data;
};

export const fetchShare = async (slug: string): Promise<ShareFetchResponse> => {
  if (typeof slug !== 'string' || slug.trim() === '') {
    throw new Error('Share slug must be provided');
  }

  const response = await fetch(`/api/share/${slug}`);
  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(message);
  }

  const data = (await response.json()) as ShareFetchResponse;
  if (!data?.payload) {
    throw new Error('Share payload missing from response');
  }

  return data;
};

export const buildSharePayload = (state: SharedState): string => {
  const gridItems = state.gridItems.map(({ alternateCoverItems, ...item }) => ({
    ...item,
  }));
  return JSON.stringify({ ...state, gridItems });
};

export const validateSharedState = (state: unknown): state is SharedState => {
  if (!state || typeof state !== 'object') return false;
  const obj = state as Record<string, unknown>;

  if (!Array.isArray(obj.gridItems)) return false;
  if (typeof obj.columns !== 'number' || Number.isNaN(obj.columns))
    return false;
  if (typeof obj.minRows !== 'number' || Number.isNaN(obj.minRows))
    return false;
  if (obj.layoutDimension !== 'height' && obj.layoutDimension !== 'chimney')
    return false;
  if (
    obj.captionMode !== 'hidden' &&
    obj.captionMode !== 'top' &&
    obj.captionMode !== 'bottom'
  )
    return false;
  if (typeof obj.captionEditsOnly !== 'boolean') return false;

  return true;
};

export const validateSharedTitle = (title: unknown): title is string => {
  return typeof title === 'string' && title.trim() !== '';
};

export type ApplySharedStateResult = {
  state: SharedState;
  slug: string;
  title: string;
};

export const loadShare = async (
  slug: string,
  defaultTitle: string,
): Promise<ApplySharedStateResult> => {
  try {
    const response = await fetchShare(slug);
    const cacheRecord: ShareCacheRecord = {
      payload: response.payload,
      title: response.title,
    };
    await storeState(
      `${INDEXEDDB_SHARE_PREFIX}${slug}`,
      JSON.stringify(cacheRecord),
    );

    const parsed = JSON.parse(response.payload) as unknown;
    if (!validateSharedState(parsed)) {
      throw new Error('Share payload is invalid');
    }

    const title = validateSharedTitle(response.title)
      ? response.title
      : defaultTitle;

    return { state: parsed, slug, title };
  } catch (err) {
    const cached = await getState(`${INDEXEDDB_SHARE_PREFIX}${slug}`);
    if (!cached) {
      throw err;
    }

    let cachedTitle = defaultTitle;
    let cachedPayload = cached;

    try {
      const parsedCache = JSON.parse(cached) as unknown;
      if (
        parsedCache &&
        typeof parsedCache === 'object' &&
        'payload' in parsedCache &&
        typeof (parsedCache as Record<string, unknown>).payload === 'string'
      ) {
        cachedPayload = (parsedCache as Record<string, unknown>)
          .payload as string;
        if (
          'title' in parsedCache &&
          validateSharedTitle((parsedCache as Record<string, unknown>).title)
        ) {
          cachedTitle = (parsedCache as Record<string, unknown>)
            .title as string;
        }
      }
    } catch {
      cachedPayload = cached;
    }

    const parsed = JSON.parse(cachedPayload) as unknown;
    if (!validateSharedState(parsed)) {
      throw new Error('Cached share payload is invalid');
    }

    return { state: parsed, slug, title: cachedTitle };
  }
};
