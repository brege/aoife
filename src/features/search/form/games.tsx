import { Combobox } from '@headlessui/react';
import type React from 'react';
import { useEffect, useState } from 'react';
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
  queryValue: string;
  platformValue: string;
  layout: 'band' | 'stack';
  bandPlacement: 'top' | 'bottom';
  onFieldChange: (fieldId: string, value: string) => void;
  formRef: React.RefObject<HTMLFormElement>;
};

const TheGamesDatabaseForm = ({
  queryField,
  platformField,
  queryValue,
  platformValue,
  layout,
  bandPlacement,
  onFieldChange,
  formRef,
}: TheGamesDatabaseFormProps) => {
  const [titleSuggestions, setTitleSuggestions] = useState<SuggestionEntry[]>(
    [],
  );
  const [isLoadingTitleSuggestions, setIsLoadingTitleSuggestions] =
    useState(false);

  useEffect(() => {
    const trimmedQuery = queryValue.trim();
    if (trimmedQuery.length < 2) {
      setTitleSuggestions([]);
      return;
    }

    let isCancelled = false;
    const requestKey = `games|${trimmedQuery}|${platformValue.trim()}`;
    const timeoutId = window.setTimeout(() => {
      setIsLoadingTitleSuggestions(true);
      const params = new URLSearchParams({
        name: trimmedQuery,
      });
      if (platformValue.trim()) {
        params.set('filter[platform]', platformValue.trim());
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
  }, [platformValue, queryValue]);

  const comboboxPlacementClass =
    layout === 'band' ? `band-${bandPlacement}` : 'stack';

  return (
    <>
      <Combobox
        value={queryValue}
        onChange={(nextValue) => {
          onFieldChange(queryField.id, nextValue ?? '');
          formRef.current?.requestSubmit();
        }}
        as="div"
        className={`combobox ${comboboxPlacementClass}`.trim()}
      >
        <Combobox.Input
          type="text"
          value={queryValue}
          onChange={(event) =>
            onFieldChange(queryField.id, event.target.value)
          }
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
        value={platformValue}
        onChange={(value) => onFieldChange(platformField.id, value)}
        placeholder={platformField.placeholder}
        ariaLabel={platformField.label}
      />
    </>
  );
};

export { TheGamesDatabaseForm };
