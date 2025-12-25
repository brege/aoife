import type React from 'react';
import { useRef } from 'react';
import { RiPhoneFindLine } from 'react-icons/ri';
import type { MediaSearchValues, MediaType } from '../../../providers/types';
import Dropdown from '../suggestion/list';
import { BooksForm } from './books';
import { CustomSearchForm } from './custom';
import { MusicForm } from './music';
import { TheGamesDatabaseForm } from './games';
import { TheMovieDatabaseForm } from './tmdb';
import './form.css';

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
  const queryValue = String(searchValues.query ?? '');
  const artistValue = String(searchValues.artist ?? '');
  const authorValue = String(searchValues.author ?? '');
  const albumValue = String(searchValues.album ?? '');
  const bookTitleValue = String(searchValues.title ?? '');
  const platformValue = String(searchValues.platform ?? '').trim();
  const coverValue = String(searchValues.cover ?? '');

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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

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
        authorValue={authorValue}
        titleValue={bookTitleValue}
        layout={layout}
        bandPlacement={bandPlacement}
        onFieldChange={onFieldChange}
        formRef={formRef}
        onOpenCoverLink={onOpenCoverLink}
      />
    );
  } else if (mediaType === 'music') {
    const artistField = getField('artist');
    const albumField = getField('album');
    formFields = (
      <MusicForm
        artistField={artistField}
        albumField={albumField}
        artistValue={artistValue}
        albumValue={albumValue}
        layout={layout}
        bandPlacement={bandPlacement}
        onFieldChange={onFieldChange}
        formRef={formRef}
        onOpenCoverLink={onOpenCoverLink}
      />
    );
  } else if (mediaType === 'games') {
    const queryField = getField('query');
    const platformField = getField('platform');
    formFields = (
      <TheGamesDatabaseForm
        queryField={queryField}
        platformField={platformField}
        queryValue={queryValue}
        platformValue={platformValue}
        layout={layout}
        bandPlacement={bandPlacement}
        onFieldChange={onFieldChange}
        formRef={formRef}
      />
    );
  } else if (mediaType === 'movies' || mediaType === 'tv') {
    const queryField = getField('query');
    formFields = (
      <TheMovieDatabaseForm
        mediaType={mediaType}
        field={queryField}
        value={queryValue}
        layout={layout}
        bandPlacement={bandPlacement}
        onFieldChange={onFieldChange}
        formRef={formRef}
      />
    );
  } else if (mediaType === 'custom') {
    const queryField = getField('query');
    const coverField = getField('cover');
    formFields = (
      <CustomSearchForm
        queryField={queryField}
        coverField={coverField}
        queryValue={queryValue}
        coverValue={coverValue}
        onFieldChange={onFieldChange}
      />
    );
  } else {
    formFields = provider.searchFields.map((field) => (
      <input
        key={field.id}
        type="text"
        value={searchValues[field.id] ?? ''}
        onChange={(event) => onFieldChange(field.id, event.target.value)}
        placeholder={field.placeholder}
        aria-label={field.label}
        className="form-input"
        required={field.required}
        data-testid={`search-field-${field.id}`}
      />
    ));
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
