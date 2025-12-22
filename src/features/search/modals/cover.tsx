import { useEffect, useMemo, useState } from 'react';
import { MdClose } from 'react-icons/md';
import './cover.css';

type CoverLinkModalProps = {
  isOpen: boolean;
  primaryValue: string;
  secondaryValue: string;
  coverTypeLabel: string;
  coverUrl: string;
  onClose: () => void;
  onSave: (value: string) => void;
  onClear: () => void;
};

export const CoverLinkModal = ({
  isOpen,
  primaryValue,
  secondaryValue,
  coverTypeLabel,
  coverUrl,
  onClose,
  onSave,
  onClear,
}: CoverLinkModalProps) => {
  const [value, setValue] = useState(coverUrl);

  useEffect(() => {
    if (isOpen) {
      setValue(coverUrl);
    }
  }, [isOpen, coverUrl]);

  const query = useMemo(() => {
    return [primaryValue, secondaryValue].filter(Boolean).join(' ').trim();
  }, [primaryValue, secondaryValue]);

  const handleSave = () => {
    onSave(value.trim());
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="cover-link-overlay" role="presentation">
      <div className="cover-link-modal" role="dialog" aria-modal="true">
        <button
          type="button"
          className="cover-link-close"
          onClick={onClose}
          aria-label="Close cover link modal"
        >
          <MdClose aria-hidden="true" focusable="false" />
        </button>
        <h3 className="cover-link-title">Cover URL</h3>
        <p className="cover-link-subtitle">
          Paste a direct image URL for the {coverTypeLabel} cover.
        </p>
        <input
          type="url"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="https://example.com/cover.jpg"
          className="cover-link-input"
          aria-label="Cover URL"
        />
        <div className="cover-link-actions">
          <button
            type="button"
            className="cover-link-save"
            onClick={handleSave}
          >
            Save link
          </button>
          <button type="button" className="cover-link-clear" onClick={onClear}>
            Clear
          </button>
        </div>
        {query && (
          <div className="cover-link-sources">
            <a
              href={`https://duckduckgo.com/?q=${encodeURIComponent(
                `${query} ${coverTypeLabel} cover`,
              )}&ia=images&iax=images`}
              target="_blank"
              rel="noopener noreferrer"
            >
              DuckDuckGo covers
            </a>
            <a
              href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
                query,
              )}+${encodeURIComponent(coverTypeLabel)}+cover`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Images
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
