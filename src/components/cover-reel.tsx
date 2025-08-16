import React from 'react';
import './cover-reel.css';
import CloseIcon from './close-icon';
import { Movie } from '../types/media';

interface CoverReelProps {
	movies: Movie[];
	onAddMovie: () => void;
	onRemoveMovie: (movieId: number) => void;
	onPosterClick: (movie: Movie) => void;
	mode?: 'building' | 'display';
	mediaType?: 'movie' | 'tv' | 'album' | 'book';
}

const CoverReel: React.FC<CoverReelProps> = ({ 
	movies, 
	onAddMovie, 
	onRemoveMovie, 
	onPosterClick, 
	mode = 'building',
	mediaType = 'movie' 
}) => {
	const containerClass = `cover-reel-container ${mode} ${mediaType}`;
	
	return (
		<div className={containerClass}>
			{movies.map((movie) => (
				<div key={movie.id} className="cover-reel-item">
					<div className="main-poster-wrapper">
						<img
							src={movie.isCustom
								? movie.poster_path || ''
								: `https://image.tmdb.org/t/p/w200${movie.poster_path || ''}`
							}
							alt={`${movie.title} poster`}
							className="cover-reel-image"
              title={`${movie.title}${movie.release_date ? ` (${new Date(movie.release_date).getFullYear()})` : ''}`}
							onClick={() => onPosterClick(movie)} 
						/>
						<button
							className="close-button"
							onClick={() => onRemoveMovie(movie.id)}
						>
							<CloseIcon />
						</button>
					</div>
				</div>
			))}
			{movies.length < 4 && (
				<div className="cover-reel-add"
             onClick={onAddMovie}
             title="Add to cover reel"
          >
					<span>+</span>
				</div>
			)}
		</div>
	);
};

export default CoverReel;

