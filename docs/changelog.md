# Changelog

## 2025-12-18

- Updated screenshots, README, and favicon to cover new features
- Made music art finding more accurate with archive.org and iTunes refinement
- Null titles (accidents) are reset to 'aoife'
- Made dropdowns drop 'up' on mobile layouts
- Further timeout refinements in tests for GamesDB API calls
- Trash/clear now nips the URL slug and resets the title

## 2025-12-17

- Contained and templated gunicorn setup for production server
- Made gunicorn workers slightly more resilient to downed TGDB API timeouts
- Redesigned the search forms to float minimally on top of the poster grid
- Fixed button alignment in hamburger menu on mobile to use a 2-column layout
- Fixed IndexDB not being clear on trash action like localStorage
- Added regression wirkflow test for clear & reloads, fixing IndexDB v. lS race condition
- Added favicon and extended biome linting to all TypeScript files
- Change "share" in HTML attrbutes so copy-link isn't clobbered by uBlock's social filter
- Add swipability as alternative to grid-based poster selection
- Refactored search module and Vite configuration for better code maintainability
- Finish all code-hygiene tasks that extract state handlers into own modules

## 2025-12-16

- Defaulted desktop to presentation mode with new banded input form
- Reworked the search form to adapt between band and stack layouts based on viewport
- No changes made to mobile layout (stacked layout)
- Exposed an in-app test API plus stable data-test hooks so Cypress can drive state
- Tests avoid brittleness from DOM selectors using data-test attributes
- Added API integration tests and folded Cypress deeper into the test suite structure
- Added layout dimension toggle to switch between fixed-width and fixed-height poster sizing

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
