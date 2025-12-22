import { useEffect, useState } from 'react';
import { MdClose } from 'react-icons/md';
import './cover.css';

type CoverEditProps = {
  mode: 'cover';
  isOpen: boolean;
  primaryValue: string;
  secondaryValue: string;
  coverTypeLabel: string;
  coverUrl: string;
  onClose: () => void;
  onSave: (value: string) => void;
  onClear: () => void;
};

type CaptionEditProps = {
  mode: 'caption';
  isOpen: boolean;
  title: string;
  subtitle?: string;
  caption: string;
  onClose: () => void;
  onSave: (value: string) => void;
  onClear: () => void;
};

type EditModalProps = CoverEditProps | CaptionEditProps;

export const EditModal = (props: EditModalProps) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }
    if (props.mode === 'cover') {
      setValue(props.coverUrl);
    } else {
      setValue(props.caption);
    }
  }, [props]);

  if (!props.isOpen) {
    return null;
  }

  if (props.mode === 'cover') {
    const query = [props.primaryValue, props.secondaryValue]
      .filter(Boolean)
      .join(' ')
      .trim();
    const handleSave = () => {
      props.onSave(value.trim());
    };

    return (
      <div className="cover-link-overlay" role="presentation">
        <div className="cover-link-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="cover-link-close"
            onClick={props.onClose}
            aria-label="Close cover link modal"
          >
            <MdClose aria-hidden="true" focusable="false" />
          </button>
          <h3 className="cover-link-title">Cover URL</h3>
          <p className="cover-link-subtitle">
            Paste a direct image URL for the {props.coverTypeLabel} cover.
          </p>
          <input
            type="url"
            className="cover-link-input"
            placeholder="https://example.com/cover.jpg"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <div className="cover-link-meta">
            {query !== '' && (
              <span className="cover-link-query">Search: {query}</span>
            )}
          </div>
          <div className="cover-link-actions">
            <button
              type="button"
              className="cover-link-save"
              onClick={handleSave}
            >
              Save
            </button>
            <button
              type="button"
              className="cover-link-clear"
              onClick={props.onClear}
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayTitle = props.subtitle
    ? `${props.title} - ${props.subtitle}`
    : props.title;

  return (
    <div className="cover-link-overlay" role="presentation">
      <div className="cover-link-modal" role="dialog" aria-modal="true">
        <button
          type="button"
          className="cover-link-close"
          onClick={props.onClose}
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
            onClick={() => props.onSave(value.trim())}
          >
            Save
          </button>
          <button
            type="button"
            className="cover-link-clear"
            onClick={props.onClear}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};
