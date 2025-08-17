import React, { useState, useRef, useEffect, useCallback } from 'react';
import './header.css';
import { MediaType } from '../types/media';

interface HeaderProps {
  selectedMediaType?: MediaType;
  onMediaTypeChange?: (type: MediaType) => void;
}

const Header: React.FC<HeaderProps> = ({ 
  selectedMediaType = 'movies', 
  onMediaTypeChange 
}) => {
  const [title, setTitle] = useState('aoife');
  const [isEditing, setIsEditing] = useState(false);
  const [isMediaMenuOpen, setIsMediaMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Close menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (isMediaMenuOpen && !menuRef.current?.contains(e.target as Node)) {
        setIsMediaMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMediaMenuOpen]);


  const handleTitleClick = useCallback(() => setIsEditing(true), []);
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setTitle(e.target.value);

  const handleTitleBlur = () => setIsEditing(false);

  const handleMediaTypeSelect = (type: MediaType) => {
    onMediaTypeChange?.(type);
    setIsMediaMenuOpen(false);
  };


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
        <div className="media-menu" ref={menuRef}>
          <button
            className="media-menu-button"
            onClick={() => setIsMediaMenuOpen(!isMediaMenuOpen)}
            title={`Current: ${selectedMediaType.charAt(0).toUpperCase() + selectedMediaType.slice(1)}`}
          >
            ☰
          </button>
          {isMediaMenuOpen && (
            <div className="media-menu-dropdown">
              {(['movies', 'books', 'music'] as MediaType[]).map((type) => (
                <button
                  key={type}
                  className={`media-menu-item ${selectedMediaType === type ? 'active' : ''}`}
                  onClick={() => handleMediaTypeSelect(type)}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default Header;

