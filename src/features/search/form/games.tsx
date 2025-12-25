import type React from 'react';
import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { MediaSearchValues } from '../../../providers/types';
import { ControlledCombobox } from './combobox';
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
};

const TheGamesDatabaseForm = ({
  queryField,
  platformField,
  layout,
  bandPlacement,
  formRef,
}: TheGamesDatabaseFormProps) => {
  const { control, setValue } = useFormContext<MediaSearchValues>();
  const watchedQueryValue = useWatch({
    control,
    name: queryField.id as keyof MediaSearchValues,
  });
  const watchedPlatformValue = useWatch({
    control,
    name: platformField.id as keyof MediaSearchValues,
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

  return (
    <>
      <ControlledCombobox
        name={queryField.id as keyof MediaSearchValues}
        label={queryField.label}
        placeholder={queryField.placeholder}
        required={queryField.required}
        layout={layout}
        bandPlacement={bandPlacement}
        suggestions={titleSuggestions}
        isLoading={isLoadingTitleSuggestions}
        dataTestId={`search-field-${queryField.id}`}
        onSubmit={() => {
          formRef.current?.requestSubmit();
        }}
      />
      <Platform
        value={
          typeof watchedPlatformValue === 'string' ? watchedPlatformValue : ''
        }
        onChange={(nextValue) => {
          setValue(platformField.id, nextValue);
        }}
        placeholder={platformField.placeholder}
        ariaLabel={platformField.label}
      />
    </>
  );
};

export { TheGamesDatabaseForm };
