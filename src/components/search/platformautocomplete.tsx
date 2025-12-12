import { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { useDropdownNavigation } from '../../lib/escape';
import './platformautocomplete.css';

type Platform = {
  id: string;
  name: string;
};

interface PlatformAutocompleteProps {
  value: string;
  onChange: (platformId: string) => void;
  placeholder: string;
  ariaLabel: string;
}

export function PlatformAutocomplete({
  onChange,
  placeholder,
  ariaLabel,
}: PlatformAutocompleteProps) {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [filteredPlatforms, setFilteredPlatforms] = useState<Platform[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const fetchPlatforms = async () => {
      try {
        const response = await axios.get('/api/games/platforms');
        const platformsData = response.data.data.platforms;
        const platformList = Object.values(platformsData).map(
          (platform: any) => ({
            id: (platform as Platform).id.toString(),
            name: (platform as Platform).name,
          }),
        );
        setPlatforms(platformList);
      } catch {
        setPlatforms([]);
      }
    };

    fetchPlatforms();
  }, []);

  useEffect(() => {
    if (inputValue.trim() === '') {
      setFilteredPlatforms(platforms);
    } else {
      const filtered = platforms.filter((p) =>
        p.name.toLowerCase().includes(inputValue.toLowerCase()),
      );
      setFilteredPlatforms(filtered);
    }
    setHighlightedIndex(-1);
  }, [inputValue, platforms]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSelectPlatform = (platform: Platform) => {
    setInputValue(platform.name);
    onChange(platform.id);
    setShowDropdown(false);
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target as Node) &&
      inputRef.current &&
      !inputRef.current.contains(e.target as Node)
    ) {
      setShowDropdown(false);
    }
  };

  const handleMoveDown = useCallback(() => {
    if (!showDropdown) {
      setShowDropdown(true);
    } else {
      setHighlightedIndex((prev) =>
        prev < filteredPlatforms.length - 1 ? prev + 1 : prev,
      );
    }
  }, [showDropdown, filteredPlatforms.length]);

  const handleMoveUp = useCallback(() => {
    setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
  }, []);

  const handleSelectHighlighted = useCallback(() => {
    if (highlightedIndex >= 0 && highlightedIndex < filteredPlatforms.length) {
      handleSelectPlatform(filteredPlatforms[highlightedIndex]);
    }
  }, [highlightedIndex, filteredPlatforms]);

  const handleCloseDropdown = useCallback(() => {
    setShowDropdown(false);
    setHighlightedIndex(-1);
  }, []);

  const handleKeyDown = useDropdownNavigation(showDropdown, {
    onMoveDown: handleMoveDown,
    onMoveUp: handleMoveUp,
    onSelect: handleSelectHighlighted,
    onClose: handleCloseDropdown,
  });

  useEffect(() => {
    const highlightedElement = optionRefs.current[highlightedIndex];
    if (highlightedElement) {
      highlightedElement.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [highlightedIndex]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="platform-autocomplete">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowDropdown(true)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="search-input"
      />
      {showDropdown && filteredPlatforms.length > 0 && (
        <div ref={dropdownRef} className="platform-dropdown">
          {filteredPlatforms.slice(0, 10).map((platform, index) => (
            <div
              key={platform.id}
              ref={(el) => {
                optionRefs.current[index] = el;
              }}
              className={`platform-option ${index === highlightedIndex ? 'highlighted' : ''}`}
              onClick={() => handleSelectPlatform(platform)}
            >
              {platform.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
