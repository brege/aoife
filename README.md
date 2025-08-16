# aoife

A clean, responsive media collection tool for creating year-in-review, favorite films, etc galleries.

## Features

- Search and collect media using different APIs
- Dual-mode display: compact building mode and adaptive gallery view
- Responsive grid layout (2x2 mobile, 4x1 desktop for movies)
- Alternate poster selection

## Examples

| Desktop | Mobile |
|:------- |:------ |
| <img src="assets/img/films-set-in-michigan.png" alt="Films Set in Michigan" width="400"/> | <img src="assets/img/mobile-summer-2025-films.png" alt="Mobile Summer 2025 Films" width="300"/> |


## Quick Start

```bash
npm install
npm run dev
```

Add your TMDB API key to `.env`:
```
VITE_TMDB_API_KEY=your_key_here
```

## Tech Stack

- React + TypeScript
- Vite for build and development
- CSS Grid for responsive layouts
- TMDB API for movie/TV data (more to come)

## Development

```bash
npm run dev     # Start development server
npm run build   # Build for production
npm run lint    # Run ESLint
```

## Roadmap

- [x] **Movies** (TMDB API)
- [ ] **TV Shows** (TMDB API)
- [ ] **Games**
  - IGDB (Internet Game Database)
  - Giant Bomb API
  - Steam API
- [ ] **Books**
  - Google Books API
  - Open Library API
- [ ] **Music**
  - Last.fm API
  - Spotify Web API
  - MusicBrainz API
- [ ] **Podcasts**
  - Listen Notes API
  - iTunes Search API
  - Podcast Index API
- [ ] **Websites/Bookmarks**
  - Pocket API
  - Web scraping (Open Graph)
  - Archive.org support
- [ ] **Blogs/Newsletters**
  - RSS feeds
  - Substack API
- [ ] **Scientific Articles**
  - arXiv API
  - PubMed API
  - CrossRef API

Once a handful of these have been implemented, we can begin expanding to mixed media year-in-review galleries.  Maybe you'd want to see

#### My 2025 Year-in-Review
|       |         |         |
|:----- |:------- |:------- |
| Movie | TV Show | Game    |
| Album | Book    | Podcast |

## License

MIT License
