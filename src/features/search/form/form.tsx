import type React from 'react';
import { useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { RiPhoneFindLine } from 'react-icons/ri';
import type { MediaSearchValues, MediaType } from '../../../providers/types';
import Dropdown from '../suggestion/list';
import { BooksForm } from './books';
import { CustomSearchForm } from './custom';
import { TheGamesDatabaseForm } from './games';
import { MusicForm } from './music';
import { TheMovieDatabaseForm } from './tmdb';
import './form.css';

interface MediaFormProps {
  mediaType: MediaType;
  onMediaTypeChange: (type: MediaType) => void;
  onSubmit: (values: MediaSearchValues) => void | Promise<void>;
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
  formMethods: UseFormReturn<MediaSearchValues>;
}

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
  const { control, setValue, register, handleSubmit } = formMethods;
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
  let formFields: React.ReactNode;

  if (mediaType === 'books') {
    const authorField = getField('author');
    const titleField = getField('title');
    formFields = (
      <BooksForm
        authorField={authorField}
        titleField={titleField}
        layout={layout}
        bandPlacement={bandPlacement}
        formRef={formRef}
        onOpenCoverLink={onOpenCoverLink}
        control={control}
      />
    );
  } else if (mediaType === 'music') {
    const artistField = getField('artist');
    const albumField = getField('album');
    formFields = (
      <MusicForm
        artistField={artistField}
        albumField={albumField}
        layout={layout}
        bandPlacement={bandPlacement}
        formRef={formRef}
        onOpenCoverLink={onOpenCoverLink}
        control={control}
        setValue={setValue}
      />
    );
  } else if (mediaType === 'games') {
    const queryField = getField('query');
    const platformField = getField('platform');
    formFields = (
      <TheGamesDatabaseForm
        queryField={queryField}
        platformField={platformField}
        layout={layout}
        bandPlacement={bandPlacement}
        formRef={formRef}
        control={control}
      />
    );
  } else if (mediaType === 'movies' || mediaType === 'tv') {
    const queryField = getField('query');
    formFields = (
      <TheMovieDatabaseForm
        mediaType={mediaType}
        field={queryField}
        layout={layout}
        bandPlacement={bandPlacement}
        formRef={formRef}
        control={control}
      />
    );
  } else if (mediaType === 'custom') {
    const queryField = getField('query');
    const coverField = getField('cover');
    formFields = (
      <CustomSearchForm
        queryField={queryField}
        coverField={coverField}
        control={control}
      />
    );
  } else {
    formFields = provider.searchFields.map((field) => {
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
  }

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

      <div className="form-fields">{formFields}</div>

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
    </form>
  );
};
