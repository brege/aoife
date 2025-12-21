import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropdownNavigation, useOutside } from '../../lib/escape';
import './platform.css';
import tgdbPlatforms from '../../../data/tgdb.json';

type PlatformItem = {
  id: string;
  name: string;
};

type TgdbPlatformResponse = {
  data?: {
    platforms?: Record<
      string,
      {
        id: number;
        name: string;
      }
    >;
  };
};

const PLATFORM_LIST: PlatformItem[] = Object.values(
  (tgdbPlatforms as TgdbPlatformResponse).data?.platforms ?? {},
).map((platform) => ({
  id: platform.id.toString(),
  name: platform.name,
}));

interface PlatformProps {
  value: string;
  onChange: (platformId: string) => void;
  placeholder: string;
  ariaLabel: string;
}

export function Platform({ onChange, placeholder, ariaLabel }: PlatformProps) {
  const [platforms, setPlatforms] = useState<PlatformItem[]>([]);
  const [filteredPlatforms, setFilteredPlatforms] = useState<PlatformItem[]>(
    [],
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setPlatforms(PLATFORM_LIST);
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

  const handleSelectPlatform = useCallback(
    (platform: PlatformItem) => {
      setInputValue(platform.name);
      onChange(platform.id);
      setShowDropdown(false);
    },
    [onChange],
  );

  const handleClickOutside = useCallback(() => {
    setShowDropdown(false);
  }, []);

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
  }, [highlightedIndex, filteredPlatforms, handleSelectPlatform]);

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

  useOutside(containerRef, handleClickOutside, showDropdown);

  return (
    <div className="platform-autocomplete" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowDropdown(true)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="form-input"
        data-testid="platform-input"
      />
      {showDropdown && filteredPlatforms.length > 0 && (
        <div ref={dropdownRef} className="platform-dropdown">
          {filteredPlatforms.slice(0, 10).map((platform, index) => (
            <button
              key={platform.id}
              ref={(el) => {
                optionRefs.current[index] = el;
              }}
              className={`platform-option ${index === highlightedIndex ? 'highlighted' : ''}`}
              onClick={() => handleSelectPlatform(platform)}
              type="button"
              data-testid={`platform-option-${platform.id}`}
            >
              {platform.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
