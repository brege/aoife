import type React from 'react';
import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { FaLink } from 'react-icons/fa';
import type { MediaSearchValues } from '../../../providers/types';
import { ControlledCombobox } from './combobox';
import {
  fetchSuggestions,
  normalizeTitleKey,
  parseOpenLibraryAuthorSuggestions,
  parseOpenLibraryBookSuggestions,
  parseOpenLibraryWorksSuggestions,
  type SuggestionEntry,
  scoreTitleMatch,
} from './suggestions';

type AuthorField = {
  id: string;
  label: string;
  placeholder: string;
  required?: boolean;
};

type TitleField = {
  id: string;
  label: string;
  placeholder: string;
  required?: boolean;
};

type BooksFormProps = {
  authorField: AuthorField;
  titleField: TitleField;
  layout: 'band' | 'stack';
  bandPlacement: 'top' | 'bottom';
  formRef: React.RefObject<HTMLFormElement>;
  onOpenCoverLink?: () => void;
};

const BooksForm = ({
  authorField,
  titleField,
  layout,
  bandPlacement,
  formRef,
  onOpenCoverLink,
}: BooksFormProps) => {
  const { control } = useFormContext<MediaSearchValues>();
  const watchedAuthorValue = useWatch({
    control,
    name: authorField.id as keyof MediaSearchValues,
  });
  const watchedTitleValue = useWatch({
    control,
    name: titleField.id as keyof MediaSearchValues,
  });
  const [bookTitleSuggestions, setBookTitleSuggestions] = useState<
    SuggestionEntry[]
  >([]);
  const [isLoadingBookTitleSuggestions, setIsLoadingBookTitleSuggestions] =
    useState(false);
  const [authorSuggestions, setAuthorSuggestions] = useState<SuggestionEntry[]>(
    [],
  );
  const [isLoadingAuthorSuggestions, setIsLoadingAuthorSuggestions] =
    useState(false);
  const [selectedAuthorKeys, setSelectedAuthorKeys] = useState<string[]>([]);

  useEffect(() => {
    const resolvedTitleValue =
      typeof watchedTitleValue === 'string' ? watchedTitleValue : '';
    const resolvedAuthorValue =
      typeof watchedAuthorValue === 'string' ? watchedAuthorValue : '';
    const trimmedTitle = resolvedTitleValue.trim();
    if (trimmedTitle.length < 2) {
      setBookTitleSuggestions([]);
      return;
    }

    let isCancelled = false;
    const trimmedAuthor = resolvedAuthorValue.trim();
    const authorKeySuffix = selectedAuthorKeys.join('|') || trimmedAuthor;
    const requestKey = `books-title|${trimmedTitle}|${authorKeySuffix}`;
    const timeoutId = window.setTimeout(() => {
      setIsLoadingBookTitleSuggestions(true);
      if (selectedAuthorKeys.length > 0) {
        const requests = selectedAuthorKeys.map((authorKey) => {
          const params = new URLSearchParams({ limit: '8' });
          const endpoint = `/api/openlibrary/authors/${authorKey}/works.json?${params.toString()}`;
          return fetchSuggestions(
            `${requestKey}|${authorKey}`,
            endpoint,
            (response) =>
              parseOpenLibraryWorksSuggestions(response, trimmedTitle),
          );
        });
        Promise.all(requests)
          .then((results) => {
            if (isCancelled) {
              return;
            }
            const combined = results.flat();
            const normalizedQuery = normalizeTitleKey(trimmedTitle);
            const unique = new Map<string, SuggestionEntry>();
            combined.forEach((entry) => {
              const normalizedTitle = normalizeTitleKey(entry.value);
              if (!normalizedTitle) {
                return;
              }
              if (!unique.has(normalizedTitle)) {
                unique.set(normalizedTitle, entry);
              }
            });
            const sorted = Array.from(unique.values()).sort((left, right) => {
              const leftScore = scoreTitleMatch(
                normalizedQuery,
                normalizeTitleKey(left.value),
              );
              const rightScore = scoreTitleMatch(
                normalizedQuery,
                normalizeTitleKey(right.value),
              );
              if (leftScore !== rightScore) {
                return rightScore - leftScore;
              }
              return left.label.localeCompare(right.label);
            });
            setBookTitleSuggestions(sorted.slice(0, 8));
          })
          .finally(() => {
            if (!isCancelled) {
              setIsLoadingBookTitleSuggestions(false);
            }
          });
      } else {
        const params = new URLSearchParams({
          title: trimmedTitle,
          limit: '8',
        });
        if (trimmedAuthor) {
          params.set('author', trimmedAuthor);
        }
        const endpoint = `/api/openlibrary/search.json?${params.toString()}`;

        fetchSuggestions(requestKey, endpoint, parseOpenLibraryBookSuggestions)
          .then((mapped) => {
            if (isCancelled) {
              return;
            }
            setBookTitleSuggestions(mapped);
          })
          .finally(() => {
            if (!isCancelled) {
              setIsLoadingBookTitleSuggestions(false);
            }
          });
      }
    }, 350);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [watchedAuthorValue, selectedAuthorKeys, watchedTitleValue]);

  useEffect(() => {
    const resolvedAuthorValue =
      typeof watchedAuthorValue === 'string' ? watchedAuthorValue : '';
    const trimmedAuthor = resolvedAuthorValue.trim();
    if (trimmedAuthor.length < 2) {
      setAuthorSuggestions([]);
      setSelectedAuthorKeys([]);
      return;
    }

    let isCancelled = false;
    const requestKey = `books-author|${trimmedAuthor}`;
    const timeoutId = window.setTimeout(() => {
      setIsLoadingAuthorSuggestions(true);
      const params = new URLSearchParams({
        q: trimmedAuthor,
        limit: '8',
      });
      const endpoint = `/api/openlibrary/search/authors.json?${params.toString()}`;

      fetchSuggestions(requestKey, endpoint, parseOpenLibraryAuthorSuggestions)
        .then((mapped) => {
          if (isCancelled) {
            return;
          }
          setAuthorSuggestions(mapped);
        })
        .finally(() => {
          if (!isCancelled) {
            setIsLoadingAuthorSuggestions(false);
          }
        });
    }, 350);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [watchedAuthorValue]);

  return (
    <>
      <ControlledCombobox
        name={authorField.id as keyof MediaSearchValues}
        label={authorField.label}
        placeholder={authorField.placeholder}
        required={authorField.required}
        layout={layout}
        bandPlacement={bandPlacement}
        suggestions={authorSuggestions}
        isLoading={isLoadingAuthorSuggestions}
        dataTestId={`search-field-${authorField.id}`}
        onInputChange={() => {
          setSelectedAuthorKeys([]);
          setBookTitleSuggestions([]);
        }}
        onSelect={(resolvedValue) => {
          if (!resolvedValue) {
            setSelectedAuthorKeys([]);
            setBookTitleSuggestions([]);
            return;
          }
          const matchingSuggestion = authorSuggestions.find(
            (suggestion) => suggestion.value === resolvedValue,
          );
          if (!matchingSuggestion) {
            setSelectedAuthorKeys([]);
            return;
          }
          if (!matchingSuggestion.authorKeys) {
            throw new Error('Missing OpenLibrary author keys');
          }
          setSelectedAuthorKeys(matchingSuggestion.authorKeys);
        }}
      />

      <div className="input-with-button">
        <ControlledCombobox
          name={titleField.id as keyof MediaSearchValues}
          label={titleField.label}
          placeholder={titleField.placeholder}
          required={titleField.required}
          layout={layout}
          bandPlacement={bandPlacement}
          suggestions={bookTitleSuggestions}
          isLoading={isLoadingBookTitleSuggestions}
          dataTestId={`search-field-${titleField.id}`}
          onSubmit={() => {
            window.setTimeout(() => {
              formRef.current?.requestSubmit();
            }, 0);
          }}
        />
        {onOpenCoverLink && (
          <button
            type="button"
            onClick={onOpenCoverLink}
            className="icon-button"
            aria-label="Add cover link"
            title="Add cover link"
          >
            <FaLink size={18} />
          </button>
        )}
      </div>
    </>
  );
};

export { BooksForm };
