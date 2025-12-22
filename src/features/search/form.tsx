import type React from 'react';
import { useState } from 'react';
import './form.css';
import logger from '../../lib/logger';
import type { MediaType } from '../../media/types';

interface CustomMediaFormProps {
  mediaType: MediaType;
  onAddCustomMedia: (media: {
    title: string;
    year: string;
    coverUrl: string;
  }) => void;
  onCancel: () => void;
}

const CustomMediaForm: React.FC<CustomMediaFormProps> = ({
  mediaType,
  onAddCustomMedia,
  onCancel,
}) => {
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  const getMediaTypeLabels = () => {
    switch (mediaType) {
      case 'movies':
        return {
          singular: 'Movie',
          coverLabel: 'Poster URL',
          yearLabel: 'Year',
        };
      case 'music':
        return {
          singular: 'Album',
          coverLabel: 'Cover URL',
          yearLabel: 'Year',
        };
      case 'books':
        return { singular: 'Book', coverLabel: 'Cover URL', yearLabel: 'Year' };
      default:
        return {
          singular: 'Media',
          coverLabel: 'Cover URL',
          yearLabel: 'Year',
        };
    }
  };

  const labels = getMediaTypeLabels();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    logger.info(`CUSTOM: Adding custom ${mediaType.slice(0, -1)}`, {
      context: 'CustomMediaForm.handleSubmit',
      action: 'custom_media_add',
      mediaType,
      media: {
        title,
        year,
        coverUrl,
      },
      timestamp: Date.now(),
    });

    onAddCustomMedia({ title, year, coverUrl });
    setTitle('');
    setYear('');
    setCoverUrl('');
  };

  return (
    <form className="custom-media-form" onSubmit={handleSubmit}>
      <h3>Add Custom {labels.singular}</h3>
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder={labels.yearLabel}
        value={year}
        onChange={(e) => setYear(e.target.value)}
        required
      />
      <input
        type="url"
        placeholder={labels.coverLabel}
        value={coverUrl}
        onChange={(e) => setCoverUrl(e.target.value)}
        required
      />
      <div className="form-buttons">
        <button type="submit">Add Custom {labels.singular}</button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
};

export default CustomMediaForm;
