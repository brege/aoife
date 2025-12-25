import { Combobox } from '@headlessui/react';
import type React from 'react';
import { useEffect, useState } from 'react';
import type { Control } from 'react-hook-form';
import { useController, useWatch } from 'react-hook-form';
import type { MediaSearchValues } from '../../../providers/types';
import {
  fetchSuggestions,
  parseTmdbSuggestions,
  type SuggestionEntry,
} from './suggestions';

type QueryField = {
  id: string;
  label: string;
  placeholder: string;
  required?: boolean;
};

type TheMovieDatabaseFormProps = {
  mediaType: 'movies' | 'tv';
  field: QueryField;
  layout: 'band' | 'stack';
  bandPlacement: 'top' | 'bottom';
  formRef: React.RefObject<HTMLFormElement>;
  control: Control<MediaSearchValues>;
};

const TheMovieDatabaseForm = ({
  mediaType,
  field,
  layout,
  bandPlacement,
  formRef,
  control,
}: TheMovieDatabaseFormProps) => {
  const watchedValue = useWatch({
    control,
    name: field.id as keyof MediaSearchValues,
  });
  const { field: queryField } = useController({
    name: field.id as keyof MediaSearchValues,
    control,
  });
  const [titleSuggestions, setTitleSuggestions] = useState<SuggestionEntry[]>(
    [],
  );
  const [isLoadingTitleSuggestions, setIsLoadingTitleSuggestions] =
    useState(false);

  useEffect(() => {
    const resolvedValue = typeof watchedValue === 'string' ? watchedValue : '';
    const trimmedQuery = resolvedValue.trim();
    if (trimmedQuery.length < 2) {
      setTitleSuggestions([]);
      return;
    }

    let isCancelled = false;
    const requestKey = `${mediaType}|${trimmedQuery}`;
    const timeoutId = window.setTimeout(() => {
      setIsLoadingTitleSuggestions(true);
      const searchPath = mediaType === 'tv' ? 'search/tv' : 'search/movie';
      const endpoint = `/api/tmdb/3/${searchPath}?query=${encodeURIComponent(
        trimmedQuery,
      )}`;

      const parser = parseTmdbSuggestions(mediaType);

      fetchSuggestions(requestKey, endpoint, parser)
        .then((mapped) => {
          if (isCancelled) {
            return;
          }
          setTitleSuggestions(mapped);
        })
        .finally(() => {
          if (!isCancelled) {
            setIsLoadingTitleSuggestions(false);
          }
        });
    }, 350);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [mediaType, watchedValue]);

  const comboboxPlacementClass =
    layout === 'band' ? `band-${bandPlacement}` : 'stack';

  return (
    <Combobox
      value={typeof watchedValue === 'string' ? watchedValue : ''}
      onChange={(nextValue) => {
        const resolvedValue = nextValue ?? '';
        queryField.onChange(resolvedValue);
        formRef.current?.requestSubmit();
      }}
      as="div"
      className={`combobox ${comboboxPlacementClass}`.trim()}
    >
      <Combobox.Input
        type="text"
        value={typeof watchedValue === 'string' ? watchedValue : ''}
        onChange={(event) => {
          queryField.onChange(event);
        }}
        placeholder={field.placeholder}
        aria-label={field.label}
        className="form-input"
        required={field.required}
        data-testid={`search-field-${field.id}`}
      />
      {titleSuggestions.length > 0 && (
        <Combobox.Options className="combobox-options">
          {titleSuggestions.map((suggestion) => {
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
      {isLoadingTitleSuggestions && titleSuggestions.length === 0 && (
        <div className="combobox-loading">Searching...</div>
      )}
    </Combobox>
  );
};

export { TheMovieDatabaseForm };
