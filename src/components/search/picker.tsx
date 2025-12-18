import { MdClose } from 'react-icons/md';
import Carousel from './carousel';

type PosterPickerProps = {
  coverViewMode: 'grid' | 'carousel';
  urls: string[];
  mediaTitle: string;
  onClose: () => void;
  onSelectCarouselCover: (url: string) => void;
  onSelectGridCover: (url: string, index: number) => void;
};

export const PosterPicker = ({
  coverViewMode,
  urls,
  mediaTitle,
  onClose,
  onSelectCarouselCover,
  onSelectGridCover,
}: PosterPickerProps) => {
  if (coverViewMode === 'carousel') {
    return (
      <Carousel
        urls={urls}
        mediaTitle={mediaTitle}
        onSelectCover={onSelectCarouselCover}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="search-results poster-picker">
      <button
        type="button"
        className="search-close-button"
        onClick={onClose}
        aria-label="Close alternate covers"
      >
        <MdClose aria-hidden="true" focusable="false" />
      </button>
      <h3 className="search-results-subtitle">
        Alternate covers - {mediaTitle}
      </h3>
      <div className="poster-picker-grid">
        {urls.length === 0 ? (
          <div className="poster-picker-empty">No alternate covers</div>
        ) : (
          urls.map((url, index) => (
            <button
              key={url}
              type="button"
              className="poster-picker-card"
              onClick={() => onSelectGridCover(url, index)}
              aria-label={`Use alternate cover ${index + 1}`}
            >
              <img
                src={url}
                alt={`Alternate cover ${index + 1}`}
                className="poster-picker-image"
              />
            </button>
          ))
        )}
      </div>
    </div>
  );
};
