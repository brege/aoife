# Changelog

## 2025-12-15

- Redesigned poster/cover selection with visual picker interface and large thumbnail previews
- Refactored alternative cover picker into drawer component for better UX
- Fixed close button positioning across search results, grid items, and video game posters
- Removed old bespoke close button components in favor of consistent styling
- Reduced duplicate click handlers and competing close button conflicts
- Fixed failing end-to-end tests and reorganized entire test suite

## 2025-12-14

- Added modal manager for keyboard navigation (Esc key to close modals and search results)
- Removed template stub after adding first media item to grid
- Fixed TMDb and GamesDB API proxy routing through Aoife API instead of direct client calls

## 2025-12-12

- Added backend server for production prototype deployment (gunicorn, Flask, reverse proxy setup)
- Implemented mocha E2E test suite with GitHub Actions CI/CD workflows
- Refined development tools: pre-commit hooks, linting, and test automation
- Disabled CLI bridge outside dev mode for production safety
- Fixed video game platform dropdown and search endpoint routing for production
- Added request rate limiting (clamping requests/sec) to protect production API calls
- Improved book cover loading via server-to-server requests instead of client-side proxying

## 2025-12-11

- Added video game support via The Games Database API with platform filtering and keyboard navigation
- Implemented custom media with image uploads/URLs stored in IndexedDB
- Made custom media name and cover fields optional with auto-naming from filenames
- Auto-add custom items directly to grid without intermediate search results display

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
