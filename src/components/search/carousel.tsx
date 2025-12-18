import { useGesture } from '@use-gesture/react';
import { AnimatePresence, motion } from 'framer-motion';
import type React from 'react';
import { useState } from 'react';
import { MdClose } from 'react-icons/md';
import './carousel.css';

interface CarouselProps {
  urls: string[];
  mediaTitle: string;
  onSelectCover: (url: string) => void;
  onClose: () => void;
}

const Carousel: React.FC<CarouselProps> = ({
  urls,
  mediaTitle,
  onSelectCover,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>(
    'left',
  );

  const handleNavigate = (direction: 'left' | 'right') => {
    if (direction === 'left' && currentIndex < urls.length - 1) {
      setSlideDirection('left');
      setCurrentIndex((value) => value + 1);
    } else if (direction === 'right' && currentIndex > 0) {
      setSlideDirection('right');
      setCurrentIndex((value) => value - 1);
    }
  };

  const bind = useGesture({
    onDragEnd: ({ movement: [movementX], velocity: [velocityX] }) => {
      const threshold = 25;
      const minVelocity = 0.25;
      const shouldMove =
        Math.abs(movementX) > threshold || Math.abs(velocityX) > minVelocity;
      if (!shouldMove) {
        return;
      }
      if (movementX > 0) {
        handleNavigate('right');
      } else if (movementX < 0) {
        handleNavigate('left');
      }
    },
  });

  const handleSelectCurrent = () => {
    onSelectCover(urls[currentIndex]);
    onClose();
  };

  const currentUrl = urls[currentIndex];
  const progress = ((currentIndex + 1) / urls.length) * 100;

  return (
    <div className="carousel-overlay" {...bind()}>
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
          <h3>{mediaTitle}</h3>
          <span className="carousel-counter">
            {currentIndex + 1} / {urls.length}
          </span>
        </div>

        <div className="carousel-stage">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentUrl}
              src={currentUrl}
              alt={`${mediaTitle} cover ${currentIndex + 1}`}
              className="carousel-image"
              initial={{
                x: slideDirection === 'left' ? 70 : -70,
                opacity: 0.85,
                scale: 0.98,
              }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{
                x: slideDirection === 'left' ? -70 : 70,
                opacity: 0.85,
                scale: 0.98,
              }}
              transition={{
                duration: 0.18,
                ease: [0.32, 0.72, 0, 1],
              }}
            />
          </AnimatePresence>
        </div>

        <div className="carousel-footer">
          <div className="carousel-progress-bar">
            <div
              className="carousel-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <button
            type="button"
            className="carousel-select-button"
            onClick={handleSelectCurrent}
          >
            Select this cover
          </button>
        </div>

        <div className="carousel-nav">
          <button
            type="button"
            className="carousel-nav-button"
            onClick={() => handleNavigate('right')}
            disabled={currentIndex === 0}
            aria-label="Previous cover"
          >
            ←
          </button>
          <button
            type="button"
            className="carousel-nav-button"
            onClick={() => handleNavigate('left')}
            disabled={currentIndex === urls.length - 1}
            aria-label="Next cover"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
};

export default Carousel;
