import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { GiFilmStrip } from 'react-icons/gi';
import { PiBookOpenTextLight, PiMusicNotesFill } from 'react-icons/pi';
// import { PiTelevision } from 'react-icons/pi';
// import { IoGameControllerOutline } from 'react-icons/io5';
import type { MediaType } from '../../media/types';
import './dropdown.css';

interface DropdownProps {
  value: MediaType;
  onChange: (type: MediaType) => void;
}

const MEDIA_TYPES: Array<{
  type: MediaType;
  label: string;
  icon: React.ReactNode;
}> = [
  { type: 'movies', label: 'Movies', icon: <GiFilmStrip /> },
  { type: 'books', label: 'Books', icon: <PiBookOpenTextLight /> },
  { type: 'music', label: 'Music', icon: <PiMusicNotesFill /> },
];

const Dropdown: React.FC<DropdownProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (type: MediaType) => {
    onChange(type);
    setIsOpen(false);
  };

  const currentMedia = MEDIA_TYPES.find((m) => m.type === value);

  return (
    <div className="dropdown" ref={dropdownRef}>
      <button
        type="button"
        className="dropdown-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select media type"
      >
        <span className="dropdown-icon">{currentMedia?.icon}</span>
        <span className="dropdown-label">{currentMedia?.label}</span>
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          {MEDIA_TYPES.map((media) => (
            <button
              key={media.type}
              type="button"
              className={`dropdown-option ${value === media.type ? 'active' : ''}`}
              onClick={() => handleSelect(media.type)}
            >
              <span className="dropdown-option-icon">{media.icon}</span>
              <span className="dropdown-option-label">{media.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
