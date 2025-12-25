import type React from 'react';
import { useCallback, useRef } from 'react';
import type { Control } from 'react-hook-form';
import { useController, useWatch } from 'react-hook-form';
import { MdDriveFolderUpload } from 'react-icons/md';
import { storeImage } from '../../../lib/indexeddb';
import type { MediaSearchValues } from '../../../providers/types';

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
  control: Control<MediaSearchValues>;
};

const CustomSearchForm = ({
  queryField,
  coverField,
  control,
}: CustomSearchFormProps) => {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const watchedQueryValue = useWatch({
    control,
    name: queryField.id as keyof MediaSearchValues,
  });
  const watchedCoverValue = useWatch({
    control,
    name: coverField.id as keyof MediaSearchValues,
  });
  const { field: queryController } = useController({
    name: queryField.id as keyof MediaSearchValues,
    control,
  });
  const { field: coverController } = useController({
    name: coverField.id as keyof MediaSearchValues,
    control,
  });

  const handleCoverImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const imageId = `img-${Date.now()}-${file.name}`;
        await storeImage(imageId, file);
        coverController.onChange(imageId);
        const resolvedQueryValue =
          typeof watchedQueryValue === 'string' ? watchedQueryValue : '';
        if (!resolvedQueryValue) {
          const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
          queryController.onChange(nameWithoutExtension);
        }
      }
    },
    [coverController, queryController, watchedQueryValue],
  );

  return (
    <>
      <input
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
      <div className="input-with-button">
        <input
          type="text"
          value={typeof watchedCoverValue === 'string' ? watchedCoverValue : ''}
          onChange={(event) => {
            coverController.onChange(event);
          }}
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
