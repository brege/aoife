import React from 'react';
import './grid-constructor.css';
import CloseIcon from './close-icon';
import { Movie } from '../types/media';
import logger from '../utils/logger';

interface GridConstructorProps {
  selectedMovies: Movie[];
  onRemoveMovie: (movieId: number) => void;
  onPosterClick: () => void;
  showPosterGrid: boolean;
  alternatePosterPaths: string[];
  onSelectAlternatePoster: (path: string) => void;
  onClosePosterGrid: () => void;
  onPlaceholderClick: () => void;
}

const GridConstructor: React.FC<GridConstructorProps> = ({
  selectedMovies,
  onRemoveMovie,
  onPosterClick,
  showPosterGrid,
  alternatePosterPaths,
  onSelectAlternatePoster,
  onClosePosterGrid,
  onPlaceholderClick,
}) => {
  return (
    <div className="grid-constructor">
      <div className="movie-poster-container">
        {selectedMovies.length > 0 ? (
          <div className="main-poster-wrapper">
            <img
              src={
                selectedMovies[0].isCustom
                  ? selectedMovies[0].poster_path || ''
                  : `https://image.tmdb.org/t/p/w500${selectedMovies[0].poster_path || ''}`
              }
              alt={`${selectedMovies[0].title} poster`}
              className="movie-poster"
              title={`${selectedMovies[0].title}${
                selectedMovies[0].release_date
                  ? ` (${new Date(selectedMovies[0].release_date).getFullYear()})`
                  : ''
              }`} 
              onClick={onPosterClick}
            />
            <button
              className="close-button"
              onClick={() => onRemoveMovie(selectedMovies[0].id)}
              aria-label={`Remove ${selectedMovies[0].title}`} 
            >
              <CloseIcon />
            </button>
          </div>
        ) : (
          <div
            className="movie-poster-placeholder"
            title="Add a movie" 
            onClick={onPlaceholderClick}
          >
            <span>+</span>
          </div>
        )}
      </div>

      {showPosterGrid && (
        <div className="poster-grid-container">
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
                    context: 'GridConstructor.onSelectAlternatePoster',
                    action: 'poster_change',
                    movie: selectedMovies[0] ? {
                      id: selectedMovies[0].id,
                      title: selectedMovies[0].title
                    } : null,
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

export default GridConstructor;

