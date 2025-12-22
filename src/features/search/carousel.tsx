import useEmblaCarousel from 'embla-carousel-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MdClose } from 'react-icons/md';
import './carousel.css';
import { isPlaceholderCover } from '../../lib/coverdetect';

interface CarouselProps {
  urls: string[];
  mediaTitle: string;
  mediaSubtitle?: string;
  onCoverError: (url: string) => void;
  onSelectCover: (url: string) => void;
  onClose: () => void;
  detectPlaceholder?: boolean;
}

const Carousel: React.FC<CarouselProps> = ({
  urls,
  mediaTitle,
  mediaSubtitle,
  onCoverError,
  onSelectCover,
  onClose,
  detectPlaceholder = false,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loadedUrls, setLoadedUrls] = useState<Record<string, boolean>>({});
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    containScroll: 'trimSnaps',
    loop: false,
    dragFree: false,
  });

  const preloadUrls = useMemo(() => {
    if (urls.length === 0) {
      return [];
    }
    const start = Math.max(0, selectedIndex - 2);
    const end = Math.min(urls.length - 1, selectedIndex + 2);
    return urls.slice(start, end + 1);
  }, [selectedIndex, urls]);

  const urlsKey = useMemo(() => urls.join('|'), [urls]);

  const handleImageLoad = useCallback(
    (url: string, event: React.SyntheticEvent<HTMLImageElement>) => {
      if (detectPlaceholder && isPlaceholderCover(event.currentTarget)) {
        setLoadedUrls((current) => ({ ...current, [url]: true }));
        onCoverError(url);
        return;
      }
      setLoadedUrls((current) => {
        if (current[url]) {
          return current;
        }
        return { ...current, [url]: true };
      });
    },
    [detectPlaceholder, onCoverError],
  );

  const handleImageError = useCallback(
    (url: string) => {
      setLoadedUrls((current) => ({ ...current, [url]: true }));
      onCoverError(url);
    },
    [onCoverError],
  );

  const handleSelect = useCallback(() => {
    if (!emblaApi) {
      return;
    }
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }
    handleSelect();
    emblaApi.on('select', handleSelect);
    emblaApi.on('reInit', handleSelect);
    return () => {
      emblaApi.off('select', handleSelect);
      emblaApi.off('reInit', handleSelect);
    };
  }, [emblaApi, handleSelect]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    preloadUrls.forEach((url) => {
      const image = new Image();
      image.src = url;
    });
  }, [preloadUrls]);

  const handleSelectCurrent = () => {
    onSelectCover(urls[selectedIndex]);
    onClose();
  };

  if (urls.length === 0) {
    return null;
  }

  const progress = ((selectedIndex + 1) / urls.length) * 100;

  return (
    <div className="carousel-overlay">
      <div className="carousel-container">
        <button
          type="button"
          className="carousel-close"
          onClick={onClose}
          aria-label="Close carousel"
        >
          <MdClose />
        </button>

        <div className="carousel-header">
          <div className="carousel-title">
            <span className="carousel-label">Alternates for</span>
            <h3>{mediaTitle}</h3>
            {mediaSubtitle && (
              <span className="carousel-subtitle">{mediaSubtitle}</span>
            )}
          </div>
          <span className="carousel-counter">
            {selectedIndex + 1} / {urls.length}
          </span>
        </div>

        <div className="carousel-stage">
          <div className="embla">
            <div className="embla__viewport" ref={emblaRef} key={urlsKey}>
              <div className="embla__container">
                {urls.map((url, index) => (
                  <div className="embla__slide" key={url}>
                    <div className="embla__slide__inner">
                      <button
                        type="button"
                        className="embla__slide__button"
                        onClick={handleSelectCurrent}
                        aria-label={`Select ${mediaTitle} cover ${index + 1}`}
                      >
                        <img
                          src={url}
                          alt={`${mediaTitle} cover ${index + 1}`}
                          className="embla__slide__img"
                          onLoad={(event) => handleImageLoad(url, event)}
                          onError={() => handleImageError(url)}
                          crossOrigin={
                            detectPlaceholder ? 'anonymous' : undefined
                          }
                          loading={
                            Math.abs(index - selectedIndex) <= 2
                              ? 'eager'
                              : 'lazy'
                          }
                        />
                      </button>
                      {!loadedUrls[url] && (
                        <div
                          className="embla__slide__loading"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="carousel-footer">
          <div className="carousel-progress-bar">
            <div
              className="carousel-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Carousel;
