# aoife

A clean, responsive media collection tool for creating year-in-review, favorite films, etc galleries.

## Features

- Search and collect media using different APIs
- Dual-mode display: compact building mode and adaptive gallery view
- Responsive grid layout
- Alternate poster selection

## Examples

| Desktop | Mobile |
|:------- |:------ |
| <img src="docs/img/desktop.png" alt="Films Set in Michigan" width="400"/> | <img src="docs/img/mobile.png" alt="Mobile Summer 2025 Films" width="300"/> |


## Installation

```bash
npm install
npm run dev
```

Add your TMDB API key to `.env`:
```
VITE_TMDB_API_KEY=your_key_here
```

## Tech Stack

### Infrastructure

- React + TypeScript
- Vite for build and development
- CSS Grid for responsive layouts
- CLI + Cypress layers for AI-development and testing
- Biome for linting, formatting, and type checking

### APIs

- TMDB API for movie/TV data
- Musicbrainz API for music
- OpenLibrary and Google Books API's books

## Development

```bash
npm run dev     # start development server
npm run build   # build for production
npm run lint    # run biome linter
```

### Roadmap

[roadmap](docs/roadmap.md)

### Changelog

[changelog](docs/changelog.md)

## License

[GPLv3](https://fsf.org/licensing/licenses/gpl-3.0)
