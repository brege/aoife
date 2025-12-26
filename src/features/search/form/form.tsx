import type React from 'react';
import { useRef } from 'react';
import { FormProvider, type UseFormReturn } from 'react-hook-form';
import { RiPhoneFindLine } from 'react-icons/ri';
import type { MediaSearchValues, MediaType } from '../../../providers/types';
import Dropdown from '../suggestion/list';
import { BooksForm } from './books';
import { CustomSearchForm } from './custom';
import { TheGamesDatabaseForm } from './games';
import { MusicForm } from './music';
import { TheMovieDatabaseForm } from './tmdb';
import './form.css';

type ProviderField = {
  id: string;
  label: string;
  placeholder: string;
  required?: boolean;
};

interface MediaFormProps {
  mediaType: MediaType;
  onMediaTypeChange: (type: MediaType) => void;
  onSubmit: (values: MediaSearchValues) => void | Promise<void>;
  isLoading: boolean;
  provider: {
    label: string;
    searchFields: ProviderField[];
  };
  layout: 'band' | 'stack';
  bandPlacement?: 'top' | 'bottom';
  onOpenCoverLink?: () => void;
  formMethods: UseFormReturn<MediaSearchValues>;
}

type FormFactoryInput = {
  mediaType: MediaType;
  layout: 'band' | 'stack';
  bandPlacement: 'top' | 'bottom';
  formRef: React.RefObject<HTMLFormElement>;
  onOpenCoverLink?: () => void;
  getField: (fieldId: string) => ProviderField;
};

const formFactories: Partial<
  Record<MediaType, (input: FormFactoryInput) => React.ReactNode>
> = {
  books: (input) => {
    const authorField = input.getField('author');
    const titleField = input.getField('title');
    return (
      <BooksForm
        authorField={authorField}
        titleField={titleField}
        layout={input.layout}
        bandPlacement={input.bandPlacement}
        formRef={input.formRef}
        onOpenCoverLink={input.onOpenCoverLink}
      />
    );
  },
  music: (input) => {
    const artistField = input.getField('artist');
    const albumField = input.getField('album');
    return (
      <MusicForm
        artistField={artistField}
        albumField={albumField}
        layout={input.layout}
        bandPlacement={input.bandPlacement}
        formRef={input.formRef}
        onOpenCoverLink={input.onOpenCoverLink}
      />
    );
  },
  games: (input) => {
    const queryField = input.getField('query');
    const platformField = input.getField('platform');
    return (
      <TheGamesDatabaseForm
        queryField={queryField}
        platformField={platformField}
        layout={input.layout}
        bandPlacement={input.bandPlacement}
        formRef={input.formRef}
      />
    );
  },
  movies: (input) => {
    const queryField = input.getField('query');
    return (
      <TheMovieDatabaseForm
        mediaType="movies"
        field={queryField}
        layout={input.layout}
        bandPlacement={input.bandPlacement}
        formRef={input.formRef}
      />
    );
  },
  tv: (input) => {
    const queryField = input.getField('query');
    return (
      <TheMovieDatabaseForm
        mediaType="tv"
        field={queryField}
        layout={input.layout}
        bandPlacement={input.bandPlacement}
        formRef={input.formRef}
      />
    );
  },
  custom: (input) => {
    const queryField = input.getField('query');
    const coverField = input.getField('cover');
    return <CustomSearchForm queryField={queryField} coverField={coverField} />;
  },
};

export const MediaForm: React.FC<MediaFormProps> = ({
  mediaType,
  onMediaTypeChange,
  onSubmit,
  isLoading,
  provider,
  layout,
  bandPlacement = 'top',
  onOpenCoverLink,
  formMethods,
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const { register, handleSubmit } = formMethods;
  const fieldByIdentifier = new Map(
    provider.searchFields.map((field) => [field.id, field]),
  );

  const getField = (fieldId: string) => {
    const field = fieldByIdentifier.get(fieldId);
    if (!field) {
      throw new Error(`Missing ${fieldId} field for ${mediaType}`);
    }
    return field;
  };

  const handleFormSubmit = handleSubmit((values) => onSubmit(values));

  const layoutClass = layout === 'band' ? 'band' : 'stack';
  const bandPlacementClass = layout === 'band' ? `band-${bandPlacement}` : '';
  const formFactory = formFactories[mediaType];
  const formFactoryInput = {
    mediaType,
    layout,
    bandPlacement,
    formRef,
    onOpenCoverLink,
    getField,
  };

  const formFields = formFactory
    ? formFactory(formFactoryInput)
    : provider.searchFields.map((field) => {
        const fieldName = field.id as keyof MediaSearchValues;
        const registered = register(fieldName);
        return (
          <input
            key={field.id}
            type="text"
            placeholder={field.placeholder}
            aria-label={field.label}
            className="form-input"
            required={field.required}
            data-testid={`search-field-${field.id}`}
            {...registered}
          />
        );
      });

  const submitButton = (
    <button
      type="submit"
      className="form-submit-button"
      disabled={isLoading}
      data-testid="search-submit"
    >
      {mediaType === 'custom' ? (
        isLoading ? (
          'Uploading...'
        ) : (
          'Add image'
        )
      ) : isLoading ? (
        'Searching...'
      ) : (
        <>
          <RiPhoneFindLine className="form-submit-icon" aria-hidden="true" />
          <span>
            {mediaType === 'music'
              ? 'Cover art'
              : mediaType === 'movies'
                ? 'Poster'
                : mediaType === 'tv'
                  ? 'Poster'
                  : mediaType === 'books'
                    ? 'Cover art'
                    : mediaType === 'games'
                      ? 'Box art'
                      : provider.label}
          </span>
        </>
      )}
    </button>
  );

  return (
    <FormProvider {...formMethods}>
      <form
        className={`media-search-form ${layoutClass} ${bandPlacementClass}`}
        onSubmit={handleFormSubmit}
        data-testid={`media-search-form-${layout}`}
        ref={formRef}
      >
        {layout === 'stack' ? (
          <>
            <div className="form-fields">{formFields}</div>
            <div className="form-toolbar">
              <Dropdown value={mediaType} onChange={onMediaTypeChange} />
              {submitButton}
            </div>
          </>
        ) : (
          <>
            <Dropdown value={mediaType} onChange={onMediaTypeChange} />
            <div className="form-fields">{formFields}</div>
            {submitButton}
          </>
        )}
      </form>
    </FormProvider>
  );
};
