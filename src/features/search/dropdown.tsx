import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { GiFilmStrip } from 'react-icons/gi';
import { MdDashboardCustomize } from 'react-icons/md';
import {
  PiBookOpenTextLight,
  PiGameControllerBold,
  PiMusicNotesFill,
  PiTelevisionSimpleBold,
} from 'react-icons/pi';
import { useDropdownNavigation, useOutside } from '../../lib/escape';
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
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useOutside(dropdownRef, () => setIsOpen(false), isOpen);

  const handleSelect = (type: MediaType) => {
    onChange(type);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const currentMedia = MEDIA_TYPES.find((m) => m.type === value);
  const currentIndex = MEDIA_TYPES.findIndex((media) => media.type === value);

  const handleMoveDown = () => {
    if (!isOpen) {
      setIsOpen(true);
      setHighlightedIndex(currentIndex);
      return;
    }
    setHighlightedIndex((prev) => {
      const nextIndex = prev < 0 ? 0 : prev + 1;
      return nextIndex >= MEDIA_TYPES.length ? 0 : nextIndex;
    });
  };

  const handleMoveUp = () => {
    if (!isOpen) {
      setIsOpen(true);
      setHighlightedIndex(currentIndex);
      return;
    }
    setHighlightedIndex((prev) => {
      if (prev < 0) {
        return MEDIA_TYPES.length - 1;
      }
      const nextIndex = prev - 1;
      return nextIndex < 0 ? MEDIA_TYPES.length - 1 : nextIndex;
    });
  };

  const handleSelectHighlighted = () => {
    if (highlightedIndex < 0 || highlightedIndex >= MEDIA_TYPES.length) {
      return;
    }
    handleSelect(MEDIA_TYPES[highlightedIndex].type);
  };

  const handleCloseDropdown = () => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = useDropdownNavigation(isOpen, {
    onMoveDown: handleMoveDown,
    onMoveUp: handleMoveUp,
    onSelect: handleSelectHighlighted,
    onClose: handleCloseDropdown,
  });

  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(currentIndex);
    } else {
      setHighlightedIndex(-1);
    }
  }, [isOpen, currentIndex]);

  useEffect(() => {
    const highlightedElement = optionRefs.current[highlightedIndex];
    if (highlightedElement) {
      highlightedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  return (
    <div className="dropdown" ref={dropdownRef}>
      <button
        type="button"
        className="dropdown-button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-label="Select media type"
        data-testid="media-type-toggle"
      >
        <span className="dropdown-icon">{currentMedia?.icon}</span>
        <span className="dropdown-label">{currentMedia?.label}</span>
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          {MEDIA_TYPES.map((media, index) => (
            <button
              key={media.type}
              type="button"
              ref={(el) => {
                optionRefs.current[index] = el;
              }}
              className={`dropdown-option ${value === media.type ? 'active' : ''} ${
                index === highlightedIndex ? 'highlighted' : ''
              }`}
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
