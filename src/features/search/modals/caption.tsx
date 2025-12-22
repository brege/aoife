import { useEffect, useState } from 'react';
import { MdClose } from 'react-icons/md';
import './cover.css';

type CaptionModalProps = {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  caption: string;
  onClose: () => void;
  onSave: (value: string) => void;
  onClear: () => void;
};

export const CaptionModal = ({
  isOpen,
  title,
  subtitle,
  caption,
  onClose,
  onSave,
  onClear,
}: CaptionModalProps) => {
  const [value, setValue] = useState(caption);

  useEffect(() => {
    if (isOpen) {
      setValue(caption);
    }
  }, [isOpen, caption]);

  if (!isOpen) {
    return null;
  }

  const displayTitle = subtitle ? `${title} - ${subtitle}` : title;

  return (
    <div className="cover-link-overlay" role="presentation">
      <div className="cover-link-modal" role="dialog" aria-modal="true">
        <button
          type="button"
          className="cover-link-close"
          onClick={onClose}
          aria-label="Close caption editor"
        >
          <MdClose aria-hidden="true" focusable="false" />
        </button>
        <h3 className="cover-link-title">Caption</h3>
        <p className="cover-link-subtitle">{displayTitle}</p>
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Add a caption"
          className="cover-link-input"
          aria-label="Caption text"
          rows={3}
        />
        <div className="cover-link-actions">
          <button
            type="button"
            className="cover-link-save"
            onClick={() => onSave(value.trim())}
          >
            Save
          </button>
          <button type="button" className="cover-link-clear" onClick={onClear}>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};
