import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../styles/global.css';
import './media-search.css';
import Header from './header';
import Grid2x2 from './grid-2x2';
import CustomMediaForm from './custom-media-form';
import CloseIcon from './close-icon';
import useEscapeKey from '../hooks/useEscapeKey';
import { useCliBridge } from '../hooks/useCliBridge';
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
  const [gridMovies, setGridMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [alternatePosterPaths, setAlternatePosterPaths] = useState<string[]>([]);
  const [showPosterGrid, setShowPosterGrid] = useState(false);
  const [activePosterMovieId, setActivePosterMovieId] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
  const API_BASE_URL = 'https://api.themoviedb.org/3';

  useEffect(() => {
    // Load grid data from localStorage
    const storedGrid = localStorage.getItem('gridMovies');
    if (storedGrid) {
      const parsedGrid = JSON.parse(storedGrid);
      setGridMovies(Array.isArray(parsedGrid) ? parsedGrid : []);
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


  const handleAddMedia = (media: Movie) => {
    // Only add if grid isn't full (max 4 items)
    if (gridMovies.length >= 4) {
      logger.warn('Cannot add media: grid is full (4/4)', {
        context: 'MediaSearch.handleAddMedia',
        action: 'add_rejected_full_grid'
      });
      return;
    }

    const updatedGrid = [...gridMovies, media];
    setGridMovies(updatedGrid);
    setSearchResults([]);
    setSearchQuery('');
    localStorage.setItem('gridMovies', JSON.stringify(updatedGrid));
    
    logger.info(`GRID: Added "${media.title}" to position ${gridMovies.length}`, {
      context: 'MediaSearch.handleAddMedia',
      action: 'grid_media_added',
      media: {
        id: media.id,
        title: media.title,
        year: media.release_date ? new Date(media.release_date).getFullYear() : 'N/A'
      },
      position: gridMovies.length,
      gridPosition: `(${Math.floor(gridMovies.length / 2)}, ${gridMovies.length % 2})`,
      gridCount: updatedGrid.length,
      gridLayout: updatedGrid.map((m, i) => ({ 
        position: i, 
        title: m.title,
        matrixPos: `(${Math.floor(i / 2)}, ${i % 2})`
      })),
      timestamp: Date.now()
    });
  };

  const handleRemoveMedia = (mediaId: number) => {
    const mediaToRemove = gridMovies.find(m => m.id === mediaId);
    const removedPosition = gridMovies.findIndex(m => m.id === mediaId);
    
    const updatedGrid = gridMovies.filter((media) => media.id !== mediaId);
    setGridMovies(updatedGrid);
    localStorage.setItem('gridMovies', JSON.stringify(updatedGrid));
    
    logger.info(`GRID: Removed "${mediaToRemove?.title || 'unknown'}" from position ${removedPosition}`, {
      context: 'MediaSearch.handleRemoveMedia',
      action: 'grid_media_removed',
      mediaId,
      position: removedPosition,
      gridPosition: `(${Math.floor(removedPosition / 2)}, ${removedPosition % 2})`,
      gridCount: updatedGrid.length,
      gridLayout: updatedGrid.map((m, i) => ({ 
        position: i, 
        title: m.title,
        matrixPos: `(${Math.floor(i / 2)}, ${i % 2})`
      })),
      timestamp: Date.now()
    });
  };


  const handleClosePosterGrid = () => {
    logger.info(`POSTER: Closing alternate poster grid`, {
      context: 'MediaSearch.handleClosePosterGrid',
      action: 'poster_grid_close',
      timestamp: Date.now()
    });
    setShowPosterGrid(false);
    setActivePosterMovieId(null);
  };

  const handleSelectAlternatePoster = (path: string) => {
    if (!activePosterMovieId) return;
    
    const updatedGrid = [...gridMovies];
    const movieIndex = updatedGrid.findIndex(m => m.id === activePosterMovieId);
    
    if (movieIndex === -1) return;
    
    updatedGrid[movieIndex] = { ...updatedGrid[movieIndex], poster_path: path };
    
    logger.info(`POSTER: Applied alternate poster to "${updatedGrid[movieIndex].title}"`, {
      context: 'MediaSearch.handleSelectAlternatePoster',
      action: 'poster_applied',
      media: {
        id: updatedGrid[movieIndex].id,
        title: updatedGrid[movieIndex].title
      },
      position: movieIndex,
      posterPath: path,
      timestamp: Date.now()
    });
    
    setGridMovies(updatedGrid);
    localStorage.setItem('gridMovies', JSON.stringify(updatedGrid));
    setShowPosterGrid(false);
    setActivePosterMovieId(null);
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
    const updatedGrid = [...gridMovies, newMedia];
    setGridMovies(updatedGrid);
    localStorage.setItem('gridMovies', JSON.stringify(updatedGrid));
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

  const handleCliClearGrid = useCallback(() => {
    setGridMovies([]);
    localStorage.removeItem('gridMovies');
    logger.info('CLI-CLEAR: Grid cleared via CLI command', {
      context: 'MediaSearch.handleCliClearGrid',
      action: 'cli_grid_cleared',
      timestamp: Date.now()
    });
  }, []);

  const handleCliAddFirstResult = useCallback(async (query: string) => {
    // Search and add first result
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

      if (response.data.results && response.data.results.length > 0) {
        const firstResult = response.data.results[0];
        const details = await fetchMovieDetails(firstResult.id);
        const movieWithImdb = { ...firstResult, imdb_id: details?.imdb_id || null };
        
        // Add to grid
        handleAddMedia(movieWithImdb);
        
        logger.info(`CLI-ADD-FIRST: Added first result "${movieWithImdb.title}" for query "${query}"`, {
          context: 'MediaSearch.handleCliAddFirstResult',
          action: 'cli_add_first_result',
          query: query,
          media: { id: movieWithImdb.id, title: movieWithImdb.title },
          timestamp: Date.now()
        });
      } else {
        logger.warn(`CLI-ADD-FIRST: No results found for query "${query}"`, {
          context: 'MediaSearch.handleCliAddFirstResult',
          query: query
        });
      }
    } catch (err) {
      logger.error('CLI add first result failed', {
        context: 'MediaSearch.handleCliAddFirstResult',
        query: query,
        error: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setIsLoading(false);
    }
  }, [API_KEY, fetchMovieDetails, handleAddMedia]);

  const handleCliGetGridState = useCallback(() => {
    const gridState = {
      count: gridMovies.length,
      maxCapacity: 4,
      positions: gridMovies.map((movie, index) => ({
        position: index,
        matrixPosition: `(${Math.floor(index / 2)}, ${index % 2})`,
        movie: {
          id: movie.id,
          title: movie.title,
          year: movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'
        }
      })),
      emptyPositions: Array.from({ length: 4 - gridMovies.length }, (_, i) => ({
        position: gridMovies.length + i,
        matrixPosition: `(${Math.floor((gridMovies.length + i) / 2)}, ${(gridMovies.length + i) % 2})`
      })),
      layout: [
        [
          gridMovies[0] ? { id: gridMovies[0].id, title: gridMovies[0].title } : null,
          gridMovies[1] ? { id: gridMovies[1].id, title: gridMovies[1].title } : null
        ],
        [
          gridMovies[2] ? { id: gridMovies[2].id, title: gridMovies[2].title } : null,
          gridMovies[3] ? { id: gridMovies[3].id, title: gridMovies[3].title } : null
        ]
      ]
    };
    
    logger.info(`CLI-GRID: Grid state requested - ${gridMovies.length}/4 positions filled`, {
      context: 'MediaSearch.handleCliGetGridState',
      action: 'cli_grid_state',
      gridState,
      timestamp: Date.now()
    });
    
    return gridState;
  }, [gridMovies]);

  // Initialize CLI bridge
  useCliBridge({
    onSearch: handleCliSearch,
    onAddMedia: handleCliAddMedia,
    onRemoveMedia: handleCliRemoveMedia,
    onGetGridState: handleCliGetGridState,
    onClearGrid: handleCliClearGrid,
    onAddFirstResult: handleCliAddFirstResult
  });

  return (
    <div className="container">

      <Header 
        selectedMediaType={selectedMediaType}
        onMediaTypeChange={setSelectedMediaType}
      />

      <div className="search-section">
        <div className="search-content">
          <div className="search-module">
            <Grid2x2
              movies={gridMovies}
              onRemoveMedia={handleRemoveMedia}
              onPosterClick={(movie) => {
                logger.info(`GRID: Opening alternate poster grid for "${movie.title}"`, {
                  context: 'MediaSearch.Grid2x2.onPosterClick',
                  action: 'poster_grid_open',
                  movie: { id: movie.id, title: movie.title },
                  timestamp: Date.now()
                });
                // Track which movie the poster grid is for
                setActivePosterMovieId(movie.id);
                fetchAlternatePosterPaths(movie.id);
                setShowPosterGrid(true);
              }}
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
        {gridMovies.length < 4 && !searchResults.length && (
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
      
      <button 
        onClick={() => {
          setGridMovies([]);
          localStorage.removeItem('gridMovies');
          logger.info('CLEAR: Grid cleared and localStorage wiped', {
            context: 'MediaSearch.clearGrid',
            action: 'grid_cleared',
            timestamp: Date.now()
          });
        }}
        className="clear-grid-button"
        title="Clear grid and localStorage"
      >
        Clear
      </button>
    </div>
  );
};

export default MediaSearch;

