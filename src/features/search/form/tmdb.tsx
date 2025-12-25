import type React from 'react';
import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { MediaSearchValues } from '../../../providers/types';
import { ControlledCombobox } from './combobox';
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
};

const TheMovieDatabaseForm = ({
  mediaType,
  field,
  layout,
  bandPlacement,
  formRef,
}: TheMovieDatabaseFormProps) => {
  const { control } = useFormContext<MediaSearchValues>();
  const watchedValue = useWatch({
    control,
    name: field.id as keyof MediaSearchValues,
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

  return (
    <ControlledCombobox
      name={field.id as keyof MediaSearchValues}
      label={field.label}
      placeholder={field.placeholder}
      required={field.required}
      layout={layout}
      bandPlacement={bandPlacement}
      suggestions={titleSuggestions}
      isLoading={isLoadingTitleSuggestions}
      dataTestId={`search-field-${field.id}`}
      onSubmit={() => {
        formRef.current?.requestSubmit();
      }}
    />
  );
};

export { TheMovieDatabaseForm };
