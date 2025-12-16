export const movieSearchResults = [
  {
    id: 'movie-inception',
    title: 'Inception',
    subtitle: 'Christopher Nolan',
    year: 2010,
    type: 'movies',
    coverUrl: 'https://example.com/inception.jpg',
    metadata: { provider: 'fixture' },
  },
  {
    id: 'movie-interstellar',
    title: 'Interstellar',
    subtitle: 'Christopher Nolan',
    year: 2014,
    type: 'movies',
    coverUrl: 'https://example.com/interstellar.jpg',
    metadata: { provider: 'fixture' },
  },
];

export const tvSearchResults = [
  {
    id: 'tv-breaking-bad',
    title: 'Breaking Bad',
    year: 2008,
    type: 'tv',
    coverUrl: 'https://example.com/breaking-bad.jpg',
    metadata: { provider: 'fixture' },
  },
];

export const bookSearchResults = [
  {
    id: 'book-dune',
    title: 'Dune',
    subtitle: 'Frank Herbert',
    year: 1965,
    type: 'books',
    coverUrl: 'https://example.com/dune.jpg',
    metadata: { provider: 'fixture' },
  },
  {
    id: 'book-hobbit',
    title: 'The Hobbit',
    subtitle: 'J. R. R. Tolkien',
    year: 1937,
    type: 'books',
    coverUrl: 'https://example.com/hobbit.jpg',
    metadata: { provider: 'fixture' },
  },
];

export const defaultGridItems = [
  {
    id: 'grid-movie',
    title: 'Inception',
    year: 2010,
    type: 'movies',
    coverUrl: 'https://example.com/inception-grid.jpg',
    metadata: { provider: 'fixture' },
  },
  {
    id: 'grid-book',
    title: 'The Hobbit',
    subtitle: 'J. R. R. Tolkien',
    year: 1937,
    type: 'books',
    coverUrl: 'https://example.com/hobbit-grid.jpg',
    metadata: { provider: 'fixture' },
  },
];

export const mediaFixturesByType = {
  movies: movieSearchResults,
  tv: tvSearchResults,
  books: bookSearchResults,
};
