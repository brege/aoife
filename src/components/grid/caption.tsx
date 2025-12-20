import { useEffect, useState } from 'react';
import { MdClose } from 'react-icons/md';
import './caption.css';

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
    <div className="caption-overlay" role="presentation">
      <div className="caption-modal" role="dialog" aria-modal="true">
        <button
          type="button"
          className="caption-close"
          onClick={onClose}
          aria-label="Close caption editor"
        >
          <MdClose aria-hidden="true" focusable="false" />
        </button>
        <span className="caption-label">Caption</span>
        <h3 className="caption-title">{displayTitle}</h3>
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Add a caption"
          className="caption-input"
          aria-label="Caption text"
          rows={3}
        />
        <div className="caption-actions">
          <button
            type="button"
            className="caption-save"
            onClick={() => onSave(value.trim())}
          >
            Save
          </button>
          <button type="button" className="caption-clear" onClick={onClear}>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};
