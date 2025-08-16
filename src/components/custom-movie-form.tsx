import React, { useState } from 'react';
import './custom-movie-form.css';

interface CustomMovieFormProps {
  onAddCustomMovie: (movie: { title: string; year: string; posterUrl: string }) => void;
  onCancel: () => void;
}

const CustomMovieForm: React.FC<CustomMovieFormProps> = ({ onAddCustomMovie, onCancel }) => {
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [posterUrl, setPosterUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCustomMovie({ title, year, posterUrl });
    setTitle('');
    setYear('');
    setPosterUrl('');
  };

  return (
    <form className="custom-movie-form" onSubmit={handleSubmit}>
      <h3>Add Custom Movie</h3>
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Year"
        value={year}
        onChange={(e) => setYear(e.target.value)}
        required
      />
      <input
        type="url"
        placeholder="Poster URL"
        value={posterUrl}
        onChange={(e) => setPosterUrl(e.target.value)}
        required
      />
      <div className="form-buttons">
        <button type="submit">Add Custom Movie</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};

export default CustomMovieForm;

