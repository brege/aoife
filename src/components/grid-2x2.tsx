import React from 'react';
import './grid-2x2.css';
import CloseIcon from './close-icon';
import { Movie } from '../types/media';
import logger from '../utils/logger';

interface Grid2x2Props {
  movies: Movie[];
  onRemoveMedia: (mediaId: number) => void;
  onPosterClick: (media: Movie) => void;
  showPosterGrid: boolean;
  alternatePosterPaths: string[];
  onSelectAlternatePoster: (path: string) => void;
  onClosePosterGrid: () => void;
  onPlaceholderClick: () => void;
}

const Grid2x2: React.FC<Grid2x2Props> = ({
  movies,
  onRemoveMedia,
  onPosterClick,
  showPosterGrid,
  alternatePosterPaths,
  onSelectAlternatePoster,
  onClosePosterGrid,
  onPlaceholderClick,
}) => {
  // Matrix positions: [0] = (0,0), [1] = (0,1), [2] = (1,0), [3] = (1,1)
  const renderGridItem = (position: number) => {
    const movie = movies[position];
    
    if (movie) {
      return (
        <div key={movie.id} className="grid-item filled">
          <div className="poster-wrapper">
            <img
              src={
                movie.isCustom
                  ? movie.poster_path || ''
                  : `https://image.tmdb.org/t/p/w300${movie.poster_path || ''}`
              }
              alt={`${movie.title} poster`}
              className="grid-poster"
              title={`${movie.title}${
                movie.release_date
                  ? ` (${new Date(movie.release_date).getFullYear()})`
                  : ''
              }`}
              onClick={() => onPosterClick(movie)}
              onLoad={(e) => {
                const img = e.target as HTMLImageElement;
                // Wait for next tick to ensure dimensions are stable
                setTimeout(() => {
                  const rect = img.getBoundingClientRect();
                  const dimensions = {
                    displayWidth: Math.round(rect.width),
                    displayHeight: Math.round(rect.height),
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                    aspectRatio: (rect.width / rect.height).toFixed(2)
                  };
                  
                  logger.info(`GRID: Poster loaded at position ${position} - ${dimensions.displayWidth}x${dimensions.displayHeight}`, {
                    context: 'Grid2x2.posterLoad',
                    action: 'poster_dimensions',
                    media: { id: movie.id, title: movie.title },
                    position,
                    dimensions,
                    gridPosition: `(${Math.floor(position / 2)}, ${position % 2})`,
                    timestamp: Date.now()
                  });
                }, 50); // Increased timeout to ensure layout is complete
              }}
            />
            <button
              className="close-button"
              onClick={() => {
                logger.info(`GRID: Removed "${movie.title}" from position ${position}`, {
                  context: 'Grid2x2.onRemoveMovie',
                  action: 'grid_remove_movie',
                  movieId: movie.id,
                  position,
                  timestamp: Date.now()
                });
                onRemoveMedia(movie.id);
              }}
              aria-label={`Remove ${movie.title}`}
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div 
        key={`placeholder-${position}`} 
        className="grid-item empty"
        onClick={onPlaceholderClick}
        title="Add a movie"
      >
        <div className="placeholder-content">
          <span>+</span>
        </div>
      </div>
    );
  };

  return (
    <div className="grid-2x2">
      <div className="grid-container">
        <div className="grid-row">
          {renderGridItem(0)}
          {renderGridItem(1)}
        </div>
        <div className="grid-row">
          {renderGridItem(2)}
          {renderGridItem(3)}
        </div>
      </div>

      {showPosterGrid && (
        <div className="poster-grid-overlay">
          <button className="close-button" onClick={onClosePosterGrid}>
            <CloseIcon />
          </button>
          <h2 className="poster-grid-title">Alternate Posters</h2>
          <div className="poster-grid">
            {alternatePosterPaths.map((path, index) => (
              <img
                key={index}
                src={`https://image.tmdb.org/t/p/w200${path}`}
                alt={`Alternate poster ${index + 1}`}
                className="alternate-poster"
                title={`Alternate Poster ${index + 1}`}
                onClick={() => {
                  logger.info(`POSTER: Selected alternate poster ${index + 1}`, {
                    context: 'Grid2x2.onSelectAlternatePoster',
                    action: 'poster_change',
                    posterIndex: index + 1,
                    posterPath: path,
                    timestamp: Date.now()
                  });
                  onSelectAlternatePoster(path);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Grid2x2;