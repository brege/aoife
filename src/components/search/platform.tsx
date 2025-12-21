import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropdownNavigation, useOutside } from '../../lib/escape';
import './platform.css';

type PlatformItem = {
  id: string;
  name: string;
};

const PLATFORM_CACHE_DURATION_MS = 60 * 60 * 1000;
let cachedPlatformList: PlatformItem[] | null = null;
let cachedPlatformRequest: Promise<PlatformItem[]> | null = null;
let cachedPlatformTimestamp = 0;

const fetchPlatformList = async (): Promise<PlatformItem[]> => {
  const now = Date.now();
  if (
    cachedPlatformList &&
    now - cachedPlatformTimestamp < PLATFORM_CACHE_DURATION_MS
  ) {
    return cachedPlatformList;
  }

  if (cachedPlatformRequest) {
    return cachedPlatformRequest;
  }

  cachedPlatformRequest = axios
    .get('/api/gamesdb/v1/Platforms?page_size=100')
    .then((response) => {
      const platformsData = response.data.data.platforms;
      const platformList = Object.values(platformsData).map(
        (platform: unknown) => ({
          id: (platform as PlatformItem).id.toString(),
          name: (platform as PlatformItem).name,
        }),
      );
      cachedPlatformList = platformList;
      cachedPlatformTimestamp = Date.now();
      return platformList;
    })
    .finally(() => {
      cachedPlatformRequest = null;
    });

  return cachedPlatformRequest;
};

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
    let isCancelled = false;
    fetchPlatformList()
      .then((platformList) => {
        if (isCancelled) {
          return;
        }
        setPlatforms(platformList);
      })
      .catch(() => {
        if (!isCancelled) {
          setPlatforms([]);
        }
      });
    return () => {
      isCancelled = true;
    };
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
