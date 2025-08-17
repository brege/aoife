import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../styles/global.css';
import './media-search.css';
import Header from './header';
import GridConstructor from './grid-constructor';
import CustomMediaForm from './custom-media-form';
import CloseIcon from './close-icon';
import useEscapeKey from '../hooks/useEscapeKey';
import { useCliBridge } from '../hooks/useCliBridge';
import CoverReel from './cover-reel';
import { Movie, MediaType } from '../types/media';
import logger from '../utils/logger';

const MediaSearch: React.FC = () => {
  // Enable debug logging to track button click issues
  useEffect(() => {
    logger.setDebugMode(true);
    logger.info('MediaSearch component initialized', {
      context: 'MediaSearch'
    });
  }, []);

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
      setSelectedMedia(Array.isArray(parsedMedia) ? parsedMedia : []);
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
      logger.error(`Failed to fetch movie details for ID ${movieId}`, {
        context: 'MediaSearch.fetchMovieDetails',
        movieId,
        error: error instanceof Error ? error.message : String(error)
      });
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
      logger.debug(`Found ${response.data.results.length} search results`, {
        context: 'MediaSearch.handleSearch'
      });
      
      const moviesWithImdb = await Promise.all(
        response.data.results.map(async (movie: Movie) => {
          const details = await fetchMovieDetails(movie.id);
          return { ...movie, imdb_id: details?.imdb_id || null };
        })
      );

      logger.info(`SEARCH: Found ${moviesWithImdb.length} results for "${searchQuery}"`, {
        context: 'MediaSearch.handleSearch',
        action: 'search_results',
        query: searchQuery,
        resultsCount: moviesWithImdb.length,
        results: moviesWithImdb.map(m => ({ 
          id: m.id, 
          title: m.title, 
          year: m.release_date ? new Date(m.release_date).getFullYear() : 'N/A'
        })),
        timestamp: Date.now()
      });

      setSearchResults(moviesWithImdb);
    } catch (err) {
      setError('An error occurred while searching for movies.');
      logger.error('Search request failed', {
        context: 'MediaSearch.handleSearch',
        query: searchQuery,
        error: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setIsLoading(false);
    }
  };

  const closeSearchResults = () => {
    logger.debug('Closing search results', {
      context: 'MediaSearch.closeSearchResults'
    });
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
      logger.error('Failed to fetch alternate poster paths', {
        context: 'MediaSearch.fetchAlternatePosterPaths',
        movieId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }, [API_KEY]);

  const handleAddToCoverReel = () => {
    if (selectedMedia.length > 0) {
      logger.info(`REEL: Added "${selectedMedia[0].title}" to cover reel`, {
        context: 'MediaSearch.handleAddToCoverReel',
        action: 'reel_media_added',
        media: {
          id: selectedMedia[0].id,
          title: selectedMedia[0].title
        },
        timestamp: Date.now()
      });
      setCoverReelMedia((prevReel) => [...prevReel, selectedMedia[0]]);
    }
  };

  const handleAddMedia = (media: Movie) => {
    const currentCount = Array.isArray(selectedMedia) ? selectedMedia.length : 0;
    
    // Update state
    setSelectedMedia([media]);
    setSearchResults([]);
    setSearchQuery('');
    localStorage.setItem('selectedMedia', JSON.stringify([media]));
    
    logger.info(`GRID: Added "${media.title}" (${currentCount} → 1)`, {
      context: 'MediaSearch.handleAddMedia',
      action: 'media_added',
      media: {
        id: media.id,
        title: media.title,
        year: media.release_date ? new Date(media.release_date).getFullYear() : 'N/A'
      },
      gridCount: 1,
      timestamp: Date.now()
    });
  };

  const handleRemoveMedia = (mediaId: number) => {
    const mediaToRemove = selectedMedia.find(m => m.id === mediaId);
    const currentCount = Array.isArray(selectedMedia) ? selectedMedia.length : 0;
    
    const updatedMedia = selectedMedia.filter((media) => media.id !== mediaId);
    setSelectedMedia(updatedMedia);
    localStorage.setItem('selectedMedia', JSON.stringify(updatedMedia));
    
    logger.info(`GRID: Removed "${mediaToRemove?.title || 'unknown'}" (${currentCount} → ${updatedMedia.length})`, {
      context: 'MediaSearch.handleRemoveMedia',
      action: 'media_removed',
      mediaId,
      gridCount: updatedMedia.length,
      timestamp: Date.now()
    });
  };

  const handlePosterClick = async () => {
    if (selectedMedia.length > 0) {
      try {
        logger.info(`POSTER: Opening alternate poster grid`, {
          context: 'MediaSearch.handlePosterClick',
          action: 'poster_grid_open',
          movie: {
            id: selectedMedia[0].id,
            title: selectedMedia[0].title
          },
          timestamp: Date.now()
        });
        
        await fetchAlternatePosterPaths(selectedMedia[0].id);
        setShowPosterGrid(true);
      } catch (error) {
        logger.error('Failed to handle poster click', {
          context: 'MediaSearch.handlePosterClick',
          mediaId: selectedMedia[0]?.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  };

  const handleClosePosterGrid = () => {
    logger.info(`POSTER: Closing alternate poster grid`, {
      context: 'MediaSearch.handleClosePosterGrid',
      action: 'poster_grid_close',
      timestamp: Date.now()
    });
    setShowPosterGrid(false);
  };

  const handleSelectAlternatePoster = (path: string) => {
    const updatedMedia = [...selectedMedia];
    updatedMedia[0] = { ...updatedMedia[0], poster_path: path };
    
    logger.info(`POSTER: Applied alternate poster`, {
      context: 'MediaSearch.handleSelectAlternatePoster',
      action: 'poster_applied',
      movie: {
        id: updatedMedia[0].id,
        title: updatedMedia[0].title
      },
      posterPath: path,
      timestamp: Date.now()
    });
    
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
      logger.error('Failed to handle reel poster click', {
        context: 'MediaSearch.handleReelPosterClick',
        mediaId: media.id,
        error: error instanceof Error ? error.message : String(error)
      });
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

  // CLI Bridge handlers - must be after all function declarations
  const handleCliSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.get(`${API_BASE_URL}/search/movie`, {
        params: {
          api_key: API_KEY,
          query: query,
        },
      });

      const moviesWithImdb = await Promise.all(
        response.data.results.map(async (movie: Movie) => {
          const details = await fetchMovieDetails(movie.id);
          return { ...movie, imdb_id: details?.imdb_id || null };
        })
      );

      logger.info(`CLI-SEARCH: Found ${moviesWithImdb.length} results for "${query}"`, {
        context: 'MediaSearch.handleCliSearch',
        action: 'cli_search_results',
        query: query,
        resultsCount: moviesWithImdb.length,
        timestamp: Date.now()
      });

      setSearchResults(moviesWithImdb);
    } catch (err) {
      setError('CLI search failed');
      logger.error('CLI search request failed', {
        context: 'MediaSearch.handleCliSearch',
        query: query,
        error: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setIsLoading(false);
    }
  }, [API_KEY, fetchMovieDetails]);

  const handleCliAddMedia = useCallback((media: Movie) => {
    handleAddMedia(media);
    logger.info(`CLI-ADD: Added media "${media.title}"`, {
      context: 'MediaSearch.handleCliAddMedia',
      action: 'cli_add_media',
      media: { id: media.id, title: media.title }
    });
  }, []);

  const handleCliRemoveMedia = useCallback((id: string | number) => {
    handleRemoveMedia(Number(id));
    logger.info(`CLI-REMOVE: Removed media with ID ${id}`, {
      context: 'MediaSearch.handleCliRemoveMedia',
      action: 'cli_remove_media',
      mediaId: id
    });
  }, []);

  const handleCliGetGridState = useCallback(() => {
    return selectedMedia;
  }, [selectedMedia]);

  // Initialize CLI bridge
  useCliBridge({
    onSearch: handleCliSearch,
    onAddMedia: handleCliAddMedia,
    onRemoveMedia: handleCliRemoveMedia,
    onGetGridState: handleCliGetGridState
  });

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
            const mediaToRemove = coverReelMedia.find(m => m.id === mediaId);
            logger.info(`REEL: Removed "${mediaToRemove?.title || 'unknown'}" from cover reel`, {
              context: 'MediaSearch.CoverReel.onRemoveMovie',
              action: 'reel_media_removed',
              mediaId,
              timestamp: Date.now()
            });
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
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                placeholder={`Search for ${selectedMediaType === 'movies' ? 'a movie' : selectedMediaType === 'music' ? 'an album' : 'a book'}...`}
                className="search-input"
              />
              <button 
                type="submit" 
                className="search-button" 
                disabled={isLoading}
                onClick={() => {
                  logger.info(`SEARCH: Searching for "${searchQuery}"`, {
                    context: 'MediaSearch.SearchButton',
                    action: 'search_submit',
                    query: searchQuery,
                    timestamp: Date.now()
                  });
                }}
              >
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
                  <button 
                    className="add-button" 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      logger.info(`ADD: Adding "${movie.title}" to grid`, {
                        context: 'MediaSearch.AddButton',
                        action: 'add_media',
                        movie: {
                          id: movie.id,
                          title: movie.title,
                          year: movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'
                        },
                        timestamp: Date.now()
                      });
                      
                      handleAddMedia(movie);
                    }}
                  >
                    Add
                  </button>
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

