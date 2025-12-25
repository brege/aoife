import type React from 'react';
import { useCallback, useRef } from 'react';
import { MdDriveFolderUpload } from 'react-icons/md';
import { storeImage } from '../../../lib/indexeddb';

type QueryField = {
  id: string;
  label: string;
  placeholder: string;
  required?: boolean;
};

type CoverField = {
  id: string;
  label: string;
  placeholder: string;
  required?: boolean;
};

type CustomSearchFormProps = {
  queryField: QueryField;
  coverField: CoverField;
  queryValue: string;
  coverValue: string;
  onFieldChange: (fieldId: string, value: string) => void;
};

const CustomSearchForm = ({
  queryField,
  coverField,
  queryValue,
  coverValue,
  onFieldChange,
}: CustomSearchFormProps) => {
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleCoverImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const imageId = `img-${Date.now()}-${file.name}`;
        await storeImage(imageId, file);
        onFieldChange(coverField.id, imageId);
        if (!queryValue) {
          const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
          onFieldChange(queryField.id, nameWithoutExtension);
        }
      }
    },
    [coverField.id, onFieldChange, queryField.id, queryValue],
  );

  return (
    <>
      <input
        type="text"
        value={queryValue}
        onChange={(event) => onFieldChange(queryField.id, event.target.value)}
        placeholder={queryField.placeholder}
        aria-label={queryField.label}
        className="form-input"
        required={queryField.required}
        data-testid={`search-field-${queryField.id}`}
      />
      <div className="input-with-button">
        <input
          type="text"
          value={coverValue}
          onChange={(event) => onFieldChange(coverField.id, event.target.value)}
          placeholder={coverField.placeholder}
          aria-label={coverField.label}
          className="form-input"
          required={coverField.required}
          data-testid="search-field-cover"
        />
        <input
          type="file"
          accept="image/*"
          onChange={handleCoverImageUpload}
          style={{ display: 'none' }}
          id="cover-file-input"
          ref={coverInputRef}
          aria-label="Upload cover image"
          data-testid="cover-file-input"
        />
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          className="icon-button"
          aria-label="Upload image"
          title="Upload image"
          data-testid="cover-upload-trigger"
        >
          <MdDriveFolderUpload size={20} />
        </button>
      </div>
    </>
  );
};

export { CustomSearchForm };
