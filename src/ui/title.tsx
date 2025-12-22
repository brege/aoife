import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import './title.css';
import logger from '../lib/logger';

interface EditableTitleProps {
  title: string;
  onTitleChange: (title: string) => void;
  className?: string;
}

const EditableTitle: React.FC<EditableTitleProps> = ({
  title,
  onTitleChange,
  className = '',
}) => {
  const [draftTitle, setDraftTitle] = useState(title);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) {
      setDraftTitle(title);
    }
  }, [isEditing, title]);

  const handleTitleClick = useCallback(() => setIsEditing(true), []);

  const handleDraftTitleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraftTitle(e.target.value);

  const handleTitleBlur = () => {
    setIsEditing(false);
    onTitleChange(draftTitle);
    logger.info(`TITLE: Title changed to "${draftTitle}"`, {
      context: 'EditableTitle.handleTitleBlur',
      action: 'title_change',
      newTitle: draftTitle,
      timestamp: Date.now(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    }
    if (e.key === 'Escape') {
      setDraftTitle(title);
      setIsEditing(false);
    }
  };

  return (
    <>
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={draftTitle}
          onChange={handleDraftTitleChange}
          onBlur={handleTitleBlur}
          onKeyDown={handleKeyPress}
          className={`editable-title-input ${className}`}
        />
      ) : (
        <h1 className="editable-title-wrapper">
          <button
            type="button"
            className={`editable-title ${className}`}
            onClick={handleTitleClick}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleTitleClick();
              }
            }}
            title="Click to edit title"
          >
            {title}
          </button>
        </h1>
      )}
    </>
  );
};

export default EditableTitle;
