## Changelog

### 2025-12-26

AM: React Library Commoditization
- Separated grid primitives into reusable components
- Added TanStack Query for cached media searches and alternate covers
- Migrated app state to Zustand with local storage persistence
- Adopted Zod schemas to validate provider API responses
- Added useLocalStorage and useResizeObserver hooks for automatic, clean read/write
- Replaced grid drag and drop with @dnd-kit to improve accessibility

PM: Usability and Feature Work
- Compacted mobile form stack with media type + add button in one row
- Removed desktop drag handle overlay and added source/link hover labels
- Replaced fixed-width layout toggle with a new Chimney mode
- Menu groups reorganized for Discovery, Grid Layout, and Captions
- Split transferable vs local state of localStorage:
    - captions and grid layout are permalink-transferable
    - menu panel states, swipe mode, and form placement remain local-only
    - reset button clears ALL states back to default
- Remove encoding images to upload as URLs (a mistake)
- Fixed locked input fields on custom image uploads
- Added light mode

### 2025-12-25

- Replaced handrolled logging with pino in frontend and middleware
- Split search forms into provider modules and adopted react-hook-form
- Now keep search band at top while results are open
- Mobile picker view expands full screen instead of partially

### 2026-12-24

- Improved music cover-art quality by defaulting to highest quality from CAA
- Made music searches clamp on rgid, not exact album ID for more diverse alts

### 2026-12-23

- Fixed/relaxed custom upload blocking on general media type to clamp only to localStorage files
- Made CSS theme-able with var(--\*) variables
- Added Drag-n-Reorder support for grid items on both mobile and desktop

### 2026-12-22

- Reorganized component and business-logic topology in src/
- Extracted CandidateCards as common component from picker and results
- Extracted common edit modal from custom cover-urls and captions
- Added hover links to service providers from main-view posters
- Added Provider links for books, music, and thegamersdb
- Added a poster-dimensions hover overlay
- Just use "Show More" instead of "Show X More" since books, music are non-deterministic
- Replaced the "Add" in "Add <MediaType>" button with HiMiniViewfinderCircle react-icon

### 2026-12-21

- Add search suggestion support for all providers
- Update cover finders to align with new string matching metadata
- Untangled environment variables used in production, dev, and test

### 2025-12-20

- UI: better picker/search results styles
- UI: add a star badge to highlight currently indexed poster
- UX: introduce captions that are positionable and editable by clicking a media-type badge
- UX: dropdowns in band-on-bottom now drop 'up'
- UX: ensure menu doesn't display behin search stack on mobile
- UI: use common steppers and subgroups in Layout
- Backend: generate permalinks for ANY custom URL 
- UX: replaced crude carousel with SwiperJS for smoother transitions and loading

### 2025-12-19

- Books: added ranking logic and rewrote the entire book cover finder
- Books: added direct cover‑URL entry with external search engine links
- Music: ibid. 
- Music: stricter cover filtering and support for manual cover URLs
- UX: made media type dropdown persistent on refresh
- UI: added loading spinner and moving grid-aware search form placement
- Backend: quieter 404 handling
- Backend: permalinks metadata capture, rate limiting, and Flock protections
- Backend: nginx caching for GamesDB JSON responses
- Backend: added app-level rate limiting by IP and user agent

### 2025-12-18

- Updated screenshots, README, and favicon to cover new features
- Made music art finding more accurate with archive.org and iTunes refinement
- Null header titles (accidents) are reset to 'aoife'
- Made dropdowns drop 'up' on mobile layouts
- Further timeout refinements in tests for GamesDB API calls
- Clears now zaps the URL slug and resets the title
- Cleaned up the search UI and grid behavior replacing old modes with simpler math
- Media dropdown now has keybinds
- Made search and media state behavior more consistent across modes
- Removed the legacy CLI bridge and related hooks
- Made book/game error handling deterministic and tightened movie/tv fallback behavior
- Added branding: favicon and social preview generator

### 2025-12-17

- Contained and templated gunicorn setup for production server
- Made gunicorn workers slightly more resilient to downed TGDB API timeouts
- Redesigned the search forms to float minimally on top of the poster grid
- Fixed button alignment in hamburger menu on mobile to use a 2-column layout
- Fixed IndexDB not being clear on trash action like localStorage
- Added regression workflow test for clear & reloads, fixing IndexDB v. lS race condition
- Added favicon and extended biome linting to all TypeScript files
- Change "share" in HTML attributes so copy-link isn't clobbered by uBlock's social filter
- Add swipability as alternative to grid-based poster selection
- Refactored search module and Vite configuration for better code maintainability
- Finish all code-hygiene tasks that extract state handlers into own modules

### 2025-12-16

- Defaulted desktop to presentation mode with new banded input form
- Reworked the search form to adapt between band and stack layouts based on viewport
- No changes made to mobile layout (stacked layout)
- Exposed an in-app test API plus stable data-test hooks so Cypress can drive state
- Tests avoid brittleness from DOM selectors using data-test attributes
- Added API integration tests and folded Cypress deeper into the test suite structure
- Added layout dimension toggle to switch between fixed-width and fixed-height poster sizing

### 2025-12-15

- Redesigned poster/cover selection with visual picker interface and large thumbnail previews
- Refactored alternative cover picker into drawer component for better UX
- Fixed close button positioning across search results, grid items, and video game posters
- Removed old bespoke close button components in favor of consistent styling
- Reduced duplicate click handlers and competing close button conflicts
- Fixed failing end-to-end tests and reorganized entire test suite

### 2025-12-14

- Added modal manager for keyboard navigation (Esc key to close modals and search results)
- Removed template stub after adding first media item to grid
- Fixed TMDb and GamesDB API proxy routing through Aoife API instead of direct client calls

### 2025-12-12

- Added backend server for production prototype deployment (gunicorn, Flask, reverse proxy setup)
- Implemented mocha E2E test suite with GitHub Actions CI/CD workflows
- Refined development tools: pre-commit hooks, linting, and test automation
- Disabled CLI bridge outside dev mode for production safety
- Fixed video game platform dropdown and search endpoint routing for production
- Added request rate limiting (clamping requests/sec) to protect production API calls
- Improved book cover loading via server-to-server requests instead of client-side proxying

### 2025-12-11

- Added video game support via The Games Database API with platform filtering and keyboard navigation
- Implemented custom media with image uploads/URLs stored in IndexedDB
- Made custom media name and cover fields optional with auto-naming from filenames
- Auto-add custom items directly to grid without intermediate search results display

### 2025-12-08

- Added TV show support via TMDB (reuses existing movie infrastructure)
- Fixed search result thumbnails to display with actual image aspect ratios (constrained to 1:2–2:1 range)
- Added TMDB, Letterboxd, and IMDb source links to search results
- Improved dropdown icons with react-icons

### 2025-12-07

- Implemented music album search via MusicBrainz and Cover Art Archive
- Added book cover support via Google Books and Open Library APIs
- Built media type selector dropdown for Movies, TV Shows, Books, and Music
- Added presentation mode to hide search form and maximize grid display
- Condensed hamburger menu with SVG icons
- Improved grid coverage and responsive layout
- Fixed artwork cache fallback logic per media type

### 2025-12-06

- Replaced ESLint with Biome for linting and formatting
- Reorganized codebase under src/ directory
- Removed legacy container storage patterns
- Improved API endpoints and Cypress test infrastructure

### 2025-08-17

- Initial release: Movies via TMDB, custom media entries, responsive 2×2 grid
- API layer with programmatic control (`/api/search`, `/api/add`, `/api/remove`, etc.)
- Centralized logging system with browser-to-server streaming
- Alternate poster/cover selection
- Design token system and header navigation
