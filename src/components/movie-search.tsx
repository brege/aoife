import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../styles/global.css';
import './movie-search.css';
import Header from './header';
import GridConstructor from './grid-constructor';
import CustomMovieForm from './custom-movie-form';
import CloseIcon from './close-icon';
import useEscapeKey from '../hooks/useEscapeKey';
import CoverReel from './cover-reel';
import { Movie } from '../types/media';

const MovieSearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [selectedMovies, setSelectedMovies] = useState<Movie[]>([]);
  const [coverReelMovies, setCoverReelMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [alternatePosterPaths, setAlternatePosterPaths] = useState<string[]>([]);
  const [showPosterGrid, setShowPosterGrid] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
  const API_BASE_URL = 'https://api.themoviedb.org/3';

  useEffect(() => {
    const storedMovies = localStorage.getItem('selectedMovies');
    if (storedMovies) {
      const parsedMovies = JSON.parse(storedMovies);
      setSelectedMovies(parsedMovies.length > 0 ? parsedMovies[0] : []);
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

  const closeCustomMovieForm = () => {
    setShowCustomMovieForm(false);
  }
  useEscapeKey(closeCustomMovieForm);

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
    if (selectedMovies.length > 0) {
      setCoverReelMovies((prevReel) => [...prevReel, selectedMovies[0]]);
    }
  };

  const handleAddMovie = (movie: Movie) => {
    setSelectedMovies([movie]);
    setSearchResults([]);
    setSearchQuery('');
    localStorage.setItem('selectedMovies', JSON.stringify([movie]));
  };

  const handleRemoveMovie = (movieId: number) => {
    const updatedMovies = selectedMovies.filter((movie) => movie.id !== movieId);
    setSelectedMovies(updatedMovies);
    localStorage.setItem('selectedMovies', JSON.stringify(updatedMovies));
  };

  const handlePosterClick = async () => {
    if (selectedMovies.length > 0) {
      try {
        await fetchAlternatePosterPaths(selectedMovies[0].id);
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
    const updatedMovies = [...selectedMovies];
    updatedMovies[0] = { ...updatedMovies[0], poster_path: path };
    setSelectedMovies(updatedMovies);
    localStorage.setItem('selectedMovies', JSON.stringify(updatedMovies));
    setShowPosterGrid(false);
  };

  const handleReelPosterClick = async (movie: Movie) => { // ADD THIS
    setSelectedMovies([movie]);
    try {
      await fetchAlternatePosterPaths(movie.id);
      setShowPosterGrid(true);
    } catch (error) {
      console.error('Error handling reel poster click:', error);
    }
  };


  const [showCustomMovieForm, setShowCustomMovieForm] = useState(false);
  const handleAddCustomMovie = (movie: { title: string; year: string; posterUrl: string }) => {
    const newMovie: Movie = {
      id: Date.now(),
      title: movie.title,
      release_date: `${movie.year}-01-01`,
      poster_path: movie.posterUrl,
      isCustom: true,
    };
    setSelectedMovies([newMovie]);
    localStorage.setItem('selectedMovies', JSON.stringify([newMovie]));
    setShowCustomMovieForm(false);
  };

  return (
    <div className="container">

      <Header />

      {coverReelMovies.length > 0 || selectedMovies.length > 0 ? (
        <CoverReel
          movies={coverReelMovies}
          onAddMovie={handleAddToCoverReel}
          onRemoveMovie={(movieId) => {
            setCoverReelMovies((prevReel) => prevReel.filter((movie) => movie.id !== movieId));
          }}
          onPosterClick={handleReelPosterClick}
          mode="display"
          mediaType="movie"
        />
      ) : null}

      <div className="search-section">
        <div className="search-content">
          <div className="search-module">
            <GridConstructor
              selectedMovies={selectedMovies}
              onRemoveMovie={handleRemoveMovie}
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
                placeholder="Search for a movie..."
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
                  <button className="add-button" onClick={() => handleAddMovie(movie)}>Add</button>
                </div>
              ))}
            </div>
          )}
        </div>
        {!selectedMovies.length && !searchResults.length && (
          <button onClick={() => setShowCustomMovieForm(true)} className="add-custom-button">
            Add Custom Movie
          </button>
        )}
      </div>

      {showCustomMovieForm && (
        <div className="custom-form-overlay" onClick={closeCustomMovieForm}>
          <div className="custom-form-container" onClick={(e) => e.stopPropagation()}>
            <CustomMovieForm
              onAddCustomMovie={handleAddCustomMovie}
              onCancel={closeCustomMovieForm}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieSearch;

