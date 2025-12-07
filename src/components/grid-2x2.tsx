import React, { useRef } from 'react';
import './grid-2x2.css';
import CloseIcon from './close-icon';
import { Movie } from '../types/media';
import logger from '../utils/logger';

export type GridLayoutMode = 'auto' | 'force-2x2' | 'prefer-horizontal' | 'vertical-stack';

interface Grid2x2Props {
  movies: Movie[];
  onRemoveMedia: (mediaId: number) => void;
  onPosterClick: (media: Movie) => void;
  showPosterGrid: boolean;
  alternatePosterPaths: string[];
  onSelectAlternatePoster: (path: string) => void;
  onClosePosterGrid: () => void;
  onPlaceholderClick: () => void;
  layoutMode?: GridLayoutMode;
  fitToScreen?: boolean;
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
  layoutMode = 'auto',
  fitToScreen = true,
}) => {
  const movieCount = movies.length;
  const gridContainerRef = useRef<HTMLDivElement>(null);
  
  // Determine layout class based on mode and movie count
  const getLayoutClass = () => {
    switch (layoutMode) {
      case 'force-2x2':
        return 'layout-force-2x2';
      case 'prefer-horizontal':
        return 'layout-prefer-horizontal';
      case 'vertical-stack':
        return 'layout-vertical-stack';
      case 'auto':
      default:
        return `layout-${Math.min(movieCount, 4)}`;
    }
  };
  
  const layoutClass = getLayoutClass();
  const containerClass = `grid-container ${layoutClass}${fitToScreen ? ' fit-to-screen' : ''}`;

  // Debug layout information - capture current state
  React.useEffect(() => {
    if (gridContainerRef.current) {
      const container = gridContainerRef.current;
      const rect = container.getBoundingClientRect();
      const styles = getComputedStyle(container);
      
      const debugInfo = {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio,
          userAgent: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'
        },
        container: {
          dimensions: {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            left: Math.round(rect.left),
            top: Math.round(rect.top)
          },
          computedStyles: {
            display: styles.display,
            gridTemplateColumns: styles.gridTemplateColumns,
            gridTemplateRows: styles.gridTemplateRows,
            gap: styles.gap,
            justifyContent: styles.justifyContent,
            alignContent: styles.alignContent,
            width: styles.width,
            maxWidth: styles.maxWidth,
            padding: styles.padding,
            margin: styles.margin
          },
          cssClasses: containerClass.split(' ')
        },
        layout: {
          mode: layoutMode,
          class: layoutClass,
          fitToScreen: fitToScreen,
          movieCount: movieCount,
          positions: getPositionsToRender()
        },
        matrix: {
          rendered: getPositionsToRender().map(pos => ({
            position: pos,
            row: Math.floor(pos / 2),
            col: pos % 2,
            hasMovie: !!movies[pos],
            movieTitle: movies[pos]?.title || 'placeholder'
          }))
        }
      };

      logger.info(`GRID-DEBUG: Layout state captured`, {
        context: 'Grid2x2.layoutDebug',
        action: 'layout_state_capture',
        debugInfo,
        timestamp: Date.now()
      });
      
      // Store in window for CLI access
      (window as any).gridDebugInfo = debugInfo;
    }
  }, [layoutMode, fitToScreen, movieCount, movies, containerClass]);
  
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
                  const itemElement = img.closest('.grid-item') as HTMLElement;
                  const itemRect = itemElement?.getBoundingClientRect();
                  const itemStyles = itemElement ? getComputedStyle(itemElement) : null;
                  
                  const dimensions = {
                    displayWidth: Math.round(rect.width),
                    displayHeight: Math.round(rect.height),
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                    aspectRatio: (rect.width / rect.height).toFixed(2)
                  };
                  
                  const itemInfo = itemRect && itemStyles ? {
                    itemWidth: Math.round(itemRect.width),
                    itemHeight: Math.round(itemRect.height),
                    itemComputedWidth: itemStyles.width,
                    itemMinWidth: itemStyles.minWidth,
                    itemMaxWidth: itemStyles.maxWidth
                  } : {};
                  
                  // Calculate optimal sizes for comparison
                  const viewportWidth = window.innerWidth;
                  const availableWidth = viewportWidth - 32; // Account for basic padding
                  const optimalSingleWidth = Math.min(200, availableWidth * 0.8);
                  const optimalTwoColumnWidth = Math.min(164, (availableWidth - 16) / 2); // 16px gap
                  
                  const analysis = {
                    viewport: viewportWidth,
                    available: availableWidth,
                    optimalSingle: optimalSingleWidth,
                    optimalTwoColumn: optimalTwoColumnWidth,
                    actualPoster: dimensions.displayWidth,
                    actualItem: itemInfo.itemWidth,
                    efficiency: itemInfo.itemWidth ? (dimensions.displayWidth / itemInfo.itemWidth * 100).toFixed(1) + '%' : 'N/A'
                  };
                  
                  logger.info(`GRID: Poster loaded at position ${position} - ${dimensions.displayWidth}x${dimensions.displayHeight}`, {
                    context: 'Grid2x2.posterLoad',
                    action: 'poster_dimensions',
                    media: { id: movie.id, title: movie.title },
                    position,
                    dimensions,
                    itemInfo,
                    analysis,
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

  // Always show at least one placeholder unless grid is full (4 items)
  // For 3 items, we show positions: [0][1] on top row, [2][+] on bottom row (center-justified)
  const getPositionsToRender = () => {
    if (movieCount === 0) {
      return [0]; // Show single placeholder
    }
    if (movieCount === 1) {
      return [0, 1]; // Show 1 movie + 1 placeholder
    }
    if (movieCount === 2) {
      return [0, 1, 2]; // Show 2 movies + 1 placeholder
    }
    if (movieCount === 3) {
      return [0, 1, 2, 3]; // Show 3 movies + 1 placeholder (center-justified)
    }
    return [0, 1, 2, 3]; // Show all 4 positions for 4 movies (no placeholder)
  };

  return (
    <div className="grid-2x2">
      <div ref={gridContainerRef} className={containerClass}>
        {getPositionsToRender().map(position => renderGridItem(position))}
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