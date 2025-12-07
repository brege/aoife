import React, { useState, useRef, useEffect, useCallback } from 'react';
import './title.css';
import logger from '../utils/logger';

interface EditableTitleProps {
  initialTitle?: string;
  className?: string;
}

const EditableTitle: React.FC<EditableTitleProps> = ({ 
  initialTitle = 'aoife',
  className = ''
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleTitleClick = useCallback(() => setIsEditing(true), []);
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setTitle(e.target.value);

  const handleTitleBlur = () => {
    setIsEditing(false);
    logger.info(`TITLE: Title changed to "${title}"`, {
      context: 'EditableTitle.handleTitleBlur',
      action: 'title_change',
      newTitle: title,
      timestamp: Date.now()
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    }
    if (e.key === 'Escape') {
      setTitle(initialTitle);
      setIsEditing(false);
    }
  };

  return (
    <>
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={handleTitleChange}
          onBlur={handleTitleBlur}
          onKeyDown={handleKeyPress}
          className={`editable-title-input ${className}`}
        />
      ) : (
        <h1 
          className={`editable-title ${className}`}
          onClick={handleTitleClick}
          title="Click to edit title"
        >
          {title}
        </h1>
      )}
    </>
  );
};

export default EditableTitle;
