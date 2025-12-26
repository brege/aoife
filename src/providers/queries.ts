import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { getMediaService } from './factory';
import type { MediaItem, MediaSearchValues, MediaType } from './types';

export const mediaQueryKeys = {
  search: (mediaType: MediaType, values: MediaSearchValues) =>
    ['media', 'search', mediaType, values] as const,
  alternateCovers: (mediaType: MediaType, mediaId: string | number) =>
    ['media', 'alternateCovers', mediaType, mediaId] as const,
};

type UseMediaSearchReturn = {
  search: (
    mediaType: MediaType,
    values: MediaSearchValues,
  ) => Promise<MediaItem[]>;
  data: MediaItem[];
  setData: (results: MediaItem[]) => void;
  isLoading: boolean;
  error: string;
  reset: () => void;
};

export const useMediaSearch = (): UseMediaSearchReturn => {
  const queryClient = useQueryClient();
  const [data, setData] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const search = useCallback(
    async (mediaType: MediaType, values: MediaSearchValues) => {
      setIsLoading(true);
      setError('');

      try {
        const results = await queryClient.fetchQuery({
          queryKey: mediaQueryKeys.search(mediaType, values),
          queryFn: async () => {
            const service = getMediaService(mediaType);
            return service.search(values);
          },
        });
        setData(results);
        return results;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setData([]);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [queryClient],
  );

  const reset = useCallback(() => {
    setData([]);
    setError('');
  }, []);

  return { search, data, setData, isLoading, error, reset };
};

type UseAlternateCoversReturn = {
  fetch: (mediaType: MediaType, mediaId: string | number) => Promise<string[]>;
};

export const useAlternateCovers = (): UseAlternateCoversReturn => {
  const queryClient = useQueryClient();

  const fetch = useCallback(
    async (mediaType: MediaType, mediaId: string | number) => {
      return queryClient.fetchQuery({
        queryKey: mediaQueryKeys.alternateCovers(mediaType, mediaId),
        queryFn: async () => {
          const service = getMediaService(mediaType);
          return service.getAlternateCovers(mediaId);
        },
      });
    },
    [queryClient],
  );

  return { fetch };
};
