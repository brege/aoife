import type React from 'react';
import { useCallback } from 'react';
import { MdDriveFolderUpload } from 'react-icons/md';
import { storeImage } from '../../lib/indexeddb';
import type { MediaSearchValues, MediaType } from '../../media/types';
import Dropdown from './dropdown';
import { PlatformAutocomplete } from './platformautocomplete';
import './mediasearchform.css';

interface MediaSearchFormProps {
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
}

export const MediaSearchForm: React.FC<MediaSearchFormProps> = ({
  mediaType,
  onMediaTypeChange,
  searchValues,
  onFieldChange,
  onSubmit,
  isLoading,
  provider,
  layout,
}) => {
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  const layoutClass = layout === 'band' ? 'band' : 'stack';

  return (
    <form
      className={`media-search-form ${layoutClass}`}
      onSubmit={handleFormSubmit}
      data-testid={`media-search-form-${layout}`}
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
              <PlatformAutocomplete
                key={field.id}
                value={searchValues[field.id] ?? ''}
                onChange={(value) => onFieldChange(field.id, value)}
                placeholder={field.placeholder}
                ariaLabel={field.label}
              />
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
                  aria-label="Upload cover image"
                  data-testid="cover-file-input"
                />
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById('cover-file-input')?.click()
                  }
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
