import type React from 'react';
import { useRef, useState } from 'react';
import { GiFilmStrip } from 'react-icons/gi';
import { MdDashboardCustomize } from 'react-icons/md';
import {
  PiBookOpenTextLight,
  PiGameControllerBold,
  PiMusicNotesFill,
  PiTelevisionSimpleBold,
} from 'react-icons/pi';
import { useOutside } from '../../lib/escape';
import type { MediaType } from '../../media/types';
import './dropdown.css';

interface DropdownProps {
  value: MediaType;
  onChange: (type: MediaType) => void;
}

export const MEDIA_TYPE_ICONS: Record<MediaType, React.ReactNode> = {
  movies: <GiFilmStrip />,
  tv: <PiTelevisionSimpleBold />,
  books: <PiBookOpenTextLight />,
  music: <PiMusicNotesFill />,
  games: <PiGameControllerBold />,
  custom: <MdDashboardCustomize />,
};

const MEDIA_TYPES: Array<{
  type: MediaType;
  label: string;
  icon: React.ReactNode;
}> = [
  { type: 'movies', label: 'Movies', icon: MEDIA_TYPE_ICONS.movies },
  { type: 'tv', label: 'TV Shows', icon: MEDIA_TYPE_ICONS.tv },
  { type: 'books', label: 'Books', icon: MEDIA_TYPE_ICONS.books },
  { type: 'music', label: 'Music', icon: MEDIA_TYPE_ICONS.music },
  { type: 'games', label: 'Games', icon: MEDIA_TYPE_ICONS.games },
  { type: 'custom', label: 'Custom', icon: MEDIA_TYPE_ICONS.custom },
];

const Dropdown: React.FC<DropdownProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useOutside(dropdownRef, () => setIsOpen(false), isOpen);

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
        data-testid="media-type-toggle"
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
              data-testid={`media-type-option-${media.type}`}
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
