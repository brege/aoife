import { Combobox } from '@headlessui/react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaLink } from 'react-icons/fa';
import { MdDriveFolderUpload } from 'react-icons/md';
import { storeImage } from '../../lib/indexeddb';
import type { MediaSearchValues, MediaType } from '../../media/types';
import Dropdown from './dropdown';
import { Platform } from './platform';
import './mediaform.css';

type SuggestionEntry = {
  id: number;
  label: string;
  value: string;
};

const SUGGESTION_CACHE_TTL_MS = 60 * 1000;
const suggestionCache = new Map<
  string,
  { timestamp: number; results: SuggestionEntry[] }
>();
const inFlightSuggestions = new Map<string, Promise<SuggestionEntry[]>>();

const fetchSuggestions = async (
  key: string,
  endpoint: string,
  mediaType: MediaType,
): Promise<SuggestionEntry[]> => {
  const cached = suggestionCache.get(key);
  if (cached && Date.now() - cached.timestamp < SUGGESTION_CACHE_TTL_MS) {
    return cached.results;
  }

  const existing = inFlightSuggestions.get(key);
  if (existing) {
    return existing;
  }

  const request = fetch(endpoint)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Suggestion request failed');
      }
      if (mediaType === 'games') {
        return response.json() as Promise<{
          data?: {
            games?: Array<{
              id: number;
              game_title: string;
              release_date?: string;
            }>;
          };
        }>;
      }
      return response.json() as Promise<{
        results?: Array<{
          id: number;
          title?: string;
          name?: string;
          release_date?: string;
          first_air_date?: string;
        }>;
      }>;
    })
    .then((data) => {
      const results =
        mediaType === 'games'
          ? Array.isArray(data?.data?.games)
            ? data.data.games
            : []
          : Array.isArray(data?.results)
            ? data.results
            : [];
      const mapped = results
        .map((result) => {
          if (mediaType === 'games') {
            const title = result.game_title?.trim();
            if (!title) {
              return null;
            }
            const year = result.release_date
              ? new Date(result.release_date).getFullYear()
              : undefined;
            const label = year ? `${title} (${year})` : title;
            return {
              id: result.id,
              label,
              value: title,
            };
          }
          const title = mediaType === 'tv' ? result.name : result.title;
          if (!title) {
            return null;
          }
          const dateValue =
            mediaType === 'tv' ? result.first_air_date : result.release_date;
          const year = dateValue
            ? new Date(dateValue).getFullYear()
            : undefined;
          const label = year ? `${title} (${year})` : title;
          return {
            id: result.id,
            label,
            value: title,
          };
        })
        .filter((item): item is SuggestionEntry => item !== null)
        .slice(0, 8);

      suggestionCache.set(key, {
        timestamp: Date.now(),
        results: mapped,
      });
      return mapped;
    })
    .finally(() => {
      inFlightSuggestions.delete(key);
    });

  inFlightSuggestions.set(key, request);
  return request;
};

interface MediaFormProps {
  mediaType: MediaType;
  onMediaTypeChange: (type: MediaType) => void;
  searchValues: MediaSearchValues;
  onFieldChange: (fieldId: string, value: string) => void;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  isLoading: boolean;
  provider: {
    label: string;
    searchFields: {
      id: string;
      label: string;
      placeholder: string;
      required?: boolean;
    }[];
  };
  layout: 'band' | 'stack';
  bandPlacement?: 'top' | 'bottom';
  onOpenCoverLink?: () => void;
}

export const MediaForm: React.FC<MediaFormProps> = ({
  mediaType,
  onMediaTypeChange,
  searchValues,
  onFieldChange,
  onSubmit,
  isLoading,
  provider,
  layout,
  bandPlacement = 'top',
  onOpenCoverLink,
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<SuggestionEntry[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const queryValue = useMemo(
    () => String(searchValues.query ?? ''),
    [searchValues.query],
  );
  const platformValue = useMemo(
    () => String(searchValues.platform ?? '').trim(),
    [searchValues.platform],
  );

  const handleCoverImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const imageId = `img-${Date.now()}-${file.name}`;
        await storeImage(imageId, file);
        onFieldChange('cover', imageId);
        if (!searchValues.query) {
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          onFieldChange('query', nameWithoutExt);
        }
      }
    },
    [searchValues.query, onFieldChange],
  );

  useEffect(() => {
    if (mediaType !== 'movies' && mediaType !== 'tv' && mediaType !== 'games') {
      setSuggestions([]);
      return;
    }

    const trimmedQuery = queryValue.trim();
    if (trimmedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    let isCancelled = false;
    const requestKey = `${mediaType}|${trimmedQuery}|${platformValue}`;
    const timeoutId = window.setTimeout(() => {
      setIsLoadingSuggestions(true);
      const endpoint = (() => {
        if (mediaType === 'games') {
          const params = new URLSearchParams({
            name: trimmedQuery,
          });
          if (platformValue) {
            params.set('filter[platform]', platformValue);
          }
          return `/api/gamesdb/v1/Games/ByGameName?${params.toString()}`;
        }
        const searchPath = mediaType === 'tv' ? 'search/tv' : 'search/movie';
        return `/api/tmdb/3/${searchPath}?query=${encodeURIComponent(
          trimmedQuery,
        )}`;
      })();

      fetchSuggestions(requestKey, endpoint, mediaType)
        .then((mapped) => {
          if (isCancelled) {
            return;
          }
          setSuggestions(mapped);
        })
        .finally(() => {
          if (!isCancelled) {
            setIsLoadingSuggestions(false);
          }
        });
    }, 200);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [mediaType, platformValue, queryValue]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  const layoutClass = layout === 'band' ? 'band' : 'stack';
  const bandPlacementClass = layout === 'band' ? `band-${bandPlacement}` : '';

  return (
    <form
      className={`media-search-form ${layoutClass} ${bandPlacementClass}`}
      onSubmit={handleFormSubmit}
      data-testid={`media-search-form-${layout}`}
      ref={formRef}
    >
      {layout === 'stack' && (
        <Dropdown value={mediaType} onChange={onMediaTypeChange} />
      )}

      {layout === 'band' && (
        <Dropdown value={mediaType} onChange={onMediaTypeChange} />
      )}

      <div className="form-fields">
        {provider.searchFields.map((field) => {
          if (field.id === 'platform') {
            return (
              <Platform
                key={field.id}
                value={searchValues[field.id] ?? ''}
                onChange={(value) => onFieldChange(field.id, value)}
                placeholder={field.placeholder}
                ariaLabel={field.label}
              />
            );
          }

          if (
            field.id === 'query' &&
            (mediaType === 'movies' ||
              mediaType === 'tv' ||
              mediaType === 'games')
          ) {
            const comboboxPlacementClass =
              layout === 'band' ? `band-${bandPlacement}` : 'stack';
            return (
              <Combobox
                key={field.id}
                value={queryValue}
                onChange={(value) => {
                  onFieldChange(field.id, value);
                  formRef.current?.requestSubmit();
                }}
                as="div"
                className={`combobox ${comboboxPlacementClass}`.trim()}
              >
                <Combobox.Input
                  type="text"
                  value={queryValue}
                  onChange={(e) => onFieldChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  aria-label={field.label}
                  className="form-input"
                  required={field.required}
                  data-testid={`search-field-${field.id}`}
                />
                {suggestions.length > 0 && (
                  <Combobox.Options className="combobox-options">
                    {suggestions.map((suggestion) => {
                      return (
                        <Combobox.Option
                          key={suggestion.id}
                          value={suggestion.value}
                          className={({ active }) =>
                            `combobox-option${active ? ' active' : ''}`
                          }
                        >
                          <span className="combobox-option-label">
                            {suggestion.label}
                          </span>
                        </Combobox.Option>
                      );
                    })}
                  </Combobox.Options>
                )}
                {isLoadingSuggestions && suggestions.length === 0 && (
                  <div className="combobox-loading">Searching...</div>
                )}
              </Combobox>
            );
          }

          if (
            field.id === 'title' &&
            mediaType === 'books' &&
            onOpenCoverLink
          ) {
            return (
              <div key={field.id} className="input-with-button">
                <input
                  type="text"
                  value={searchValues[field.id] ?? ''}
                  onChange={(e) => onFieldChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  aria-label={field.label}
                  className="form-input"
                  required={field.required}
                  data-testid={`search-field-${field.id}`}
                />
                <button
                  type="button"
                  onClick={onOpenCoverLink}
                  className="icon-button"
                  aria-label="Add cover link"
                  title="Add cover link"
                >
                  <FaLink size={18} />
                </button>
              </div>
            );
          }

          if (
            field.id === 'album' &&
            mediaType === 'music' &&
            onOpenCoverLink
          ) {
            return (
              <div key={field.id} className="input-with-button">
                <input
                  type="text"
                  value={searchValues[field.id] ?? ''}
                  onChange={(e) => onFieldChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  aria-label={field.label}
                  className="form-input"
                  required={field.required}
                  data-testid={`search-field-${field.id}`}
                />
                <button
                  type="button"
                  onClick={onOpenCoverLink}
                  className="icon-button"
                  aria-label="Add cover link"
                  title="Add cover link"
                >
                  <FaLink size={18} />
                </button>
              </div>
            );
          }

          if (field.id === 'cover' && mediaType === 'custom') {
            return (
              <div key={field.id} className="input-with-button">
                <input
                  type="text"
                  value={searchValues[field.id] ?? ''}
                  onChange={(e) => onFieldChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  aria-label={field.label}
                  className="form-input"
                  required={field.required}
                  data-testid="search-field-cover"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageUpload}
                  style={{ display: 'none' }}
                  id="cover-file-input"
                  ref={coverInputRef}
                  aria-label="Upload cover image"
                  data-testid="cover-file-input"
                />
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="icon-button"
                  aria-label="Upload image"
                  title="Upload image"
                  data-testid="cover-upload-trigger"
                >
                  <MdDriveFolderUpload size={20} />
                </button>
              </div>
            );
          }

          return (
            <input
              key={field.id}
              type="text"
              value={searchValues[field.id] ?? ''}
              onChange={(e) => onFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              aria-label={field.label}
              className="form-input"
              required={field.required}
              data-testid={`search-field-${field.id}`}
            />
          );
        })}
      </div>

      <button
        type="submit"
        className="form-submit-button"
        disabled={isLoading}
        data-testid="search-submit"
      >
        {mediaType === 'custom'
          ? isLoading
            ? 'Uploading...'
            : 'Upload'
          : isLoading
            ? 'Searching...'
            : `Add ${provider.label}`}
      </button>
    </form>
  );
};
