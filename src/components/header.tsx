import React, { useState, useRef, useEffect, useCallback } from 'react';
import './header.css';

const Header: React.FC = () => {
  const [title, setTitle] = useState('Aoife');
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

  const handleTitleBlur = () => setIsEditing(false);


  return (
    <div className="header">
      <div className="header-left">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            className="editable-title"
          />
        ) : (
          <h1 className="header-title" onClick={handleTitleClick}>
            {title}
          </h1>
        )}
      </div>
      <div className="header-right">
        {/* Future: Add media type selector, settings, etc */}
      </div>
    </div>
  );
};


export default Header;

