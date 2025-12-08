# Changelog

## 2025-12-08

- Added TV show support via TMDB (reuses existing movie infrastructure)
- Fixed search result thumbnails to display with actual image aspect ratios (constrained to 1:2–2:1 range)
- Added TMDB, Letterboxd, and IMDb source links to search results
- Improved dropdown icons with react-icons

## 2025-12-07

- Implemented music album search via MusicBrainz and Cover Art Archive
- Added book cover support via Google Books and Open Library APIs
- Built media type selector dropdown for Movies, TV Shows, Books, and Music
- Added presentation mode to hide search form and maximize grid display
- Condensed hamburger menu with SVG icons
- Improved grid coverage and responsive layout
- Fixed artwork cache fallback logic per media type

## 2025-12-06

- Replaced ESLint with Biome for linting and formatting
- Reorganized codebase under src/ directory
- Removed legacy container storage patterns
- Improved API endpoints and Cypress test infrastructure

## 2025-08-17

- Initial release: Movies via TMDB, custom media entries, responsive 2×2 grid
- API layer with programmatic control (`/api/search`, `/api/add`, `/api/remove`, etc.)
- Centralized logging system with browser-to-server streaming
- Alternate poster/cover selection
- Design token system and header navigation
