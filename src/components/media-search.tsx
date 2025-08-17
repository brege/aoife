import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../styles/global.css';
import './media-search.css';
import Header from './header';
import GridConstructor from './grid-constructor';
import CustomMediaForm from './custom-media-form';
import CloseIcon from './close-icon';
import useEscapeKey from '../hooks/useEscapeKey';
import CoverReel from './cover-reel';
import { Movie, MediaType } from '../types/media';

const MediaSearch: React.FC = () => {
  const [selectedMediaType, setSelectedMediaType] = useState<MediaType>('movies');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<Movie[]>([]);
  const [coverReelMedia, setCoverReelMedia] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [alternatePosterPaths, setAlternatePosterPaths] = useState<string[]>([]);
  const [showPosterGrid, setShowPosterGrid] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
  const API_BASE_URL = 'https://api.themoviedb.org/3';

  useEffect(() => {
    const storedMedia = localStorage.getItem('selectedMedia');
    if (storedMedia) {
      const parsedMedia = JSON.parse(storedMedia);
      setSelectedMedia(parsedMedia.length > 0 ? parsedMedia[0] : []);
    }
  }, []);

  const fetchMovieDetails = useCallback(async (movieId: number) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/movie/${movieId}`, {
        params: {
          api_key: API_KEY,
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching details for movie ${movieId}:`, error);
      return null;
    }
  }, [API_KEY, API_BASE_URL]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await axios.get(`${API_BASE_URL}/search/movie`, {
        params: {
          api_key: API_KEY,
          query: searchQuery,
        },
      });

      // Fetch movie details including imdb_id for each search result
      const moviesWithImdb = await Promise.all(
        response.data.results.map(async (movie: Movie) => {
          const details = await fetchMovieDetails(movie.id);
          return { ...movie, imdb_id: details?.imdb_id || null };
        })
      );

      setSearchResults(moviesWithImdb);
    } catch (err) {
      setError('An error occurred while searching for movies.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const closeSearchResults = () => {
    setSearchResults([]);
  }
  useEscapeKey(closeSearchResults);

  const closeCustomMediaForm = () => {
    setShowCustomMediaForm(false);
  }
  useEscapeKey(closeCustomMediaForm);

  const fetchAlternatePosterPaths = useCallback(async (movieId: number) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/movie/${movieId}/images`, {
        params: {
          api_key: API_KEY,
        },
      });
      const posters = response.data.posters.map((poster: { file_path: string }) => poster.file_path);
      setAlternatePosterPaths(posters);
    } catch (error) {
      console.error('Error fetching alternate posters:', error);
    }
  }, [API_KEY]);

  const handleAddToCoverReel = () => {
    if (selectedMedia.length > 0) {
      setCoverReelMedia((prevReel) => [...prevReel, selectedMedia[0]]);
    }
  };

  const handleAddMedia = (media: Movie) => {
    setSelectedMedia([media]);
    setSearchResults([]);
    setSearchQuery('');
    localStorage.setItem('selectedMedia', JSON.stringify([media]));
  };

  const handleRemoveMedia = (mediaId: number) => {
    const updatedMedia = selectedMedia.filter((media) => media.id !== mediaId);
    setSelectedMedia(updatedMedia);
    localStorage.setItem('selectedMedia', JSON.stringify(updatedMedia));
  };

  const handlePosterClick = async () => {
    if (selectedMedia.length > 0) {
      try {
        await fetchAlternatePosterPaths(selectedMedia[0].id);
        setShowPosterGrid(true);
      } catch (error) {
        console.error('Error handling poster click:', error);
      }
    }
  };

  const handleClosePosterGrid = () => {
    setShowPosterGrid(false);
  };

  const handleSelectAlternatePoster = (path: string) => {
    const updatedMedia = [...selectedMedia];
    updatedMedia[0] = { ...updatedMedia[0], poster_path: path };
    setSelectedMedia(updatedMedia);
    localStorage.setItem('selectedMedia', JSON.stringify(updatedMedia));
    setShowPosterGrid(false);
  };

  const handleReelPosterClick = async (media: Movie) => {
    setSelectedMedia([media]);
    try {
      await fetchAlternatePosterPaths(media.id);
      setShowPosterGrid(true);
    } catch (error) {
      console.error('Error handling reel poster click:', error);
    }
  };


  const [showCustomMediaForm, setShowCustomMediaForm] = useState(false);
  const handleAddCustomMedia = (media: { title: string; year: string; posterUrl: string }) => {
    const newMedia: Movie = {
      id: Date.now(),
      title: media.title,
      release_date: `${media.year}-01-01`,
      poster_path: media.posterUrl,
      isCustom: true,
    };
    setSelectedMedia([newMedia]);
    localStorage.setItem('selectedMedia', JSON.stringify([newMedia]));
    setShowCustomMediaForm(false);
  };

  return (
    <div className="container">

      <Header 
        selectedMediaType={selectedMediaType}
        onMediaTypeChange={setSelectedMediaType}
      />

      {coverReelMedia.length > 0 || selectedMedia.length > 0 ? (
        <CoverReel
          movies={coverReelMedia}
          onAddMovie={handleAddToCoverReel}
          onRemoveMovie={(mediaId) => {
            setCoverReelMedia((prevReel) => prevReel.filter((media) => media.id !== mediaId));
          }}
          onPosterClick={handleReelPosterClick}
          mode="display"
          mediaType={selectedMediaType}
        />
      ) : null}

      <div className="search-section">
        <div className="search-content">
          <div className="search-module">
            <GridConstructor
              selectedMovies={selectedMedia}
              onRemoveMovie={handleRemoveMedia}
              onPosterClick={handlePosterClick}
              showPosterGrid={showPosterGrid}
              alternatePosterPaths={alternatePosterPaths}
              onSelectAlternatePoster={handleSelectAlternatePoster}
              onClosePosterGrid={handleClosePosterGrid}
              onPlaceholderClick={() => searchInputRef.current?.focus()}
            />
            <form onSubmit={handleSearch} className="search-form">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search for ${selectedMediaType === 'movies' ? 'a movie' : selectedMediaType === 'music' ? 'an album' : 'a book'}...`}
                className="search-input"
              />
              <button type="submit" className="search-button" disabled={isLoading}>
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </form>
          </div>
          {isLoading && <p>Loading...</p>}
          {error && <p className="error">{error}</p>}{searchResults.length > 0 && (
            <div className="search-results">
              <button className="close-button" onClick={closeSearchResults}>
                <CloseIcon />
              </button>
              <h3 className="search-results-subtitle">
                Results for: "{searchQuery.length > 20 ? searchQuery.substring(0, 20) + '...' : searchQuery}"
              </h3>
              {searchResults.map((movie) => (
                <div key={movie.id} className="movie-item">
                  {movie.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                      alt={`${movie.title} poster`}
                      className="search-result-poster"
                    />
                  ) : (
                    <div className="search-result-placeholder">+</div>
                  )}
                  <div className="movie-item-info">
                    <span className="movie-title">{`${movie.title} (${movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'})`}</span>
                    <div className="movie-details">
                      <a href={`https://www.themoviedb.org/movie/${movie.id}`}
                        target="_blank" rel="noopener noreferrer"
                        className="tmdb-link">
                        [tmdb]
                      </a>
                      <a href={`https://letterboxd.com/tmdb/${movie.id}`}
                        target="_blank" rel="noopener noreferrer"
                        className="tmdb-link">
                        [letterboxd]
                      </a>
                      {movie.imdb_id && (
                        <a
                          href={`https://www.imdb.com/title/${movie.imdb_id}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tmdb-link"
                        >
                          [imdb]
                        </a>
                      )}
                    </div>
                  </div>
                  <button className="add-button" onClick={() => handleAddMedia(movie)}>Add</button>
                </div>
              ))}
            </div>
          )}
        </div>
        {!selectedMedia.length && !searchResults.length && (
          <button onClick={() => setShowCustomMediaForm(true)} className="add-custom-button">
            Add Custom {selectedMediaType === 'movies' ? 'Movie' : selectedMediaType === 'music' ? 'Album' : 'Book'}
          </button>
        )}
      </div>

      {showCustomMediaForm && (
        <div className="custom-form-overlay" onClick={closeCustomMediaForm}>
          <div className="custom-form-container" onClick={(e) => e.stopPropagation()}>
            <CustomMediaForm
              mediaType={selectedMediaType}
              onAddCustomMedia={handleAddCustomMedia}
              onCancel={closeCustomMediaForm}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaSearch;

