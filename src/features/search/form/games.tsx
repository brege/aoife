import { Combobox } from '@headlessui/react';
import type React from 'react';
import { useEffect, useState } from 'react';
import type { Control } from 'react-hook-form';
import { useController, useWatch } from 'react-hook-form';
import type { MediaSearchValues } from '../../../providers/types';
import { Platform } from './platform';
import {
  fetchSuggestions,
  parseGameSuggestions,
  type SuggestionEntry,
} from './suggestions';

type GameQueryField = {
  id: string;
  label: string;
  placeholder: string;
  required?: boolean;
};

type PlatformField = {
  id: string;
  label: string;
  placeholder: string;
  required?: boolean;
};

type TheGamesDatabaseFormProps = {
  queryField: GameQueryField;
  platformField: PlatformField;
  layout: 'band' | 'stack';
  bandPlacement: 'top' | 'bottom';
  formRef: React.RefObject<HTMLFormElement>;
  control: Control<MediaSearchValues>;
};

const TheGamesDatabaseForm = ({
  queryField,
  platformField,
  layout,
  bandPlacement,
  formRef,
  control,
}: TheGamesDatabaseFormProps) => {
  const watchedQueryValue = useWatch({
    control,
    name: queryField.id as keyof MediaSearchValues,
  });
  const watchedPlatformValue = useWatch({
    control,
    name: platformField.id as keyof MediaSearchValues,
  });
  const { field: queryController } = useController({
    name: queryField.id as keyof MediaSearchValues,
    control,
  });
  const { field: platformController } = useController({
    name: platformField.id as keyof MediaSearchValues,
    control,
  });
  const [titleSuggestions, setTitleSuggestions] = useState<SuggestionEntry[]>(
    [],
  );
  const [isLoadingTitleSuggestions, setIsLoadingTitleSuggestions] =
    useState(false);

  useEffect(() => {
    const resolvedQueryValue =
      typeof watchedQueryValue === 'string' ? watchedQueryValue : '';
    const resolvedPlatformValue =
      typeof watchedPlatformValue === 'string' ? watchedPlatformValue : '';
    const trimmedQuery = resolvedQueryValue.trim();
    if (trimmedQuery.length < 2) {
      setTitleSuggestions([]);
      return;
    }

    let isCancelled = false;
    const requestKey = `games|${trimmedQuery}|${resolvedPlatformValue.trim()}`;
    const timeoutId = window.setTimeout(() => {
      setIsLoadingTitleSuggestions(true);
      const params = new URLSearchParams({
        name: trimmedQuery,
      });
      if (resolvedPlatformValue.trim()) {
        params.set('filter[platform]', resolvedPlatformValue.trim());
      }
      const endpoint = `/api/gamesdb/v1/Games/ByGameName?${params.toString()}`;

      fetchSuggestions(requestKey, endpoint, parseGameSuggestions)
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
  }, [watchedPlatformValue, watchedQueryValue]);

  const comboboxPlacementClass =
    layout === 'band' ? `band-${bandPlacement}` : 'stack';

  return (
    <>
      <Combobox
        value={typeof watchedQueryValue === 'string' ? watchedQueryValue : ''}
        onChange={(nextValue) => {
          const resolvedValue = nextValue ?? '';
          queryController.onChange(resolvedValue);
          formRef.current?.requestSubmit();
        }}
        as="div"
        className={`combobox ${comboboxPlacementClass}`.trim()}
      >
        <Combobox.Input
          type="text"
          value={typeof watchedQueryValue === 'string' ? watchedQueryValue : ''}
          onChange={(event) => {
            queryController.onChange(event);
          }}
          placeholder={queryField.placeholder}
          aria-label={queryField.label}
          className="form-input"
          required={queryField.required}
          data-testid={`search-field-${queryField.id}`}
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
      <Platform
        value={
          typeof watchedPlatformValue === 'string' ? watchedPlatformValue : ''
        }
        onChange={(nextValue) => {
          platformController.onChange(nextValue);
        }}
        placeholder={platformField.placeholder}
        ariaLabel={platformField.label}
      />
    </>
  );
};

export { TheGamesDatabaseForm };
