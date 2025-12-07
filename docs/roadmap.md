## Next Steps: Books + Music

The immediate goal is to evolve **aoife** from a movie‑only app into a general media collection platform. The next two targets are **music** and **books**, because they introduce real architectural challenges instead of simply repeating existing workflows. Unlike TV shows (which are easy but non-refactory) or games (which are complex but a different target market--for now), these two will force meaningful changes that make the system more flexible and future‑proof.  

**Both domains push the design in different ways.**

1. **Music** brings in square artwork, API sources like Last.fm or MusicBrainz, and album/artist metadata patterns. 
2. **Books** bring in alternative aspect ratios, APIs like Google Books or Archive.org, and metadata such as authors and editions. 

To accommodate both, we need to generalize the grid, abstract the service layer away from TMDB, and add mechanisms for media type selection and collection organization.

In addition, **aoife** must preserve its ability to create custom media items. Users should be able to search manually, upload their own covers, assign classifiers, and choose alternate artwork just as with movies.

While TMDb is excellent, the current ability to add custom media items (movie posters)
will be more valuable as the mediatype selections expand.
Nothing is ever perfect--you have to be militant with MusicBrainz Piccard and Beets for music cover art, for example.

---

#### Architectural Priorities

0. **Aspect Ratios** ✓ DONE
   - Movies, TV Shows: 2:3 ✓
   - Books: Dynamic (actual image ratio) ✓
   - Music Albums: 1:1 (next)
   The grid system now supports media‑type aware CSS with dynamic aspect ratios for books.

1. **Service Layer Abstraction** ✓ DONE
   Pluggable service interface implemented:
   ```typescript
   interface MediaService {
     search(values: MediaSearchValues): Promise<MediaSearchResult[]>;
     getAlternateCovers(id: string | number): Promise<string[]>;
     getDetails(id: string | number): Promise<MediaSearchResult | null>;
   }
   ```
   Implementations: TMDBService, BooksService, MusicService (in progress)

2. **Media Type Selection** ✓ DONE
   Header menu selector for `Movies | Books | Music` allows switching views cleanly.

3. **Collection Strategy**
   Separate collections by type (Music, Books, Movies in distinct views).
   Future: Mixed collections if needed.

4. **Custom Entry Extension**
   Custom form adapts to media type. Ready for music implementation.  

---

### Music Implementation

**Status:** In Progress

**APIs Planned:**
- **Spotify Web API** - Primary source for album art, metadata
- **MusicBrainz API** - Fallback metadata and cover art (via Cover Art Archive)
- **Last.fm API** - User listening history and album info (optional)

**Key Differences from Books:**
- Album artwork is **square (1:1 aspect ratio)** — different grid layout than movies/books
- Search metadata includes artist, release date, genres
- Multiple editions/pressings of same album (remix, reissue, etc.)
- Rich album metadata: track count, duration, label, catalog number

**Implementation Plan:**
1. Create `src/media/music.ts` with MusicService class
2. Implement Spotify album search + MusicBrainz fallback
3. Map API responses to MediaItem shape:
   - `id`: `sp:{albumId}` or `mb:{albumId}`
   - `title`: Album name
   - `subtitle`: Artist name(s)
   - `type`: 'music'
   - `coverUrl`: Album art (largest available)
   - `coverThumbnailUrl`: Album art (thumbnail)
   - `year`: Release date (extract year)
4. Implement `getAlternateCovers()`: Edition variants, remixes, reissues
5. Update factory.ts to instantiate MusicService
6. Test via CLI and UI with known albums

**API Considerations:**
- Spotify requires authentication (Client Credentials flow for app-only access)
- MusicBrainz is open but rate-limited; Cover Art Archive has free art
- Cache search results for alternate editions (like books do)

#### Summary

Books are complete. Music next leverages the same service abstraction, proving the architecture scales to different media with distinct aspect ratios and metadata patterns. Once music is done, the foundation will be strong enough for TV shows, games, podcasts, or custom media types without architectural rework.

---

### Logging & API Foundation

- [x] Port `oshea`'s centralized logging system
- [x] Browser→server log streaming via Vite middleware
- [x] Real-time terminal visibility of user actions

Track events, not keystrokes.

- [x] Poster selection changes (different poster chosen)
- [x] Hamburger menu selections  
- [x] Header bar title changes (if user modifies **aoife**)
- [x] Grid operations (add/remove items) 
- [ ] Any UI state changes affecting user experience

The important patterns to follow from **oshea**, in addition to the centralized logging system,
is to use the formatters and build on the output adapter.  There are several reasons to do this:

- **It provides communication in text visual changes from the UI.**
- **It provides a foundation for automated testing.**
- **It allows the tool to be separated into client/server components.**

The other end of this spectrum is to be able to use the server as a terminal to control the app.

#### API Layer

- [ ] Enable programmatic control via terminal commands
- [ ] Design endpoints for search/add/remove/list operations

These two items are the critical hinge in which integration and end-to-end testing can be built on,
providing a foundation for automated testing and CI integration

#### Summary

The original plan was to unify the grid structure to a generalized, user-configurable system,
but communicating what i'm seeing, what firefox is reporting, the uselessness of the terminal 
output from the Vite server, and the lack of a way to programatically control the app for direct
feedback are impossible without an API and logger.

#### Architectural Note -- An Argument for Making a CLI Layer for a React App

The CLI API layer implementation (Vite middleware at `/cli/*` endpoints) represents an unconventional architectural pattern: React applications that expose native programmatic control interfaces for development and testing. This approach fills a gap in the React ecosystem where most apps are purely GUI-first with no direct state manipulation capabilities.

Unlike existing solutions (Storybook's component isolation, Cypress/Playwright's browser automation, or Next.js API routes), this pattern provides live app introspection and direct state control without browser overhead. The bidirectional CLI ↔ GUI communication enables hybrid workflows where developers can mix interactive UI usage with scripted automation.

This architectural pattern has immediate cross-project value for **oshea** development. The middleware techniques, state bridging patterns, and logging integration being developed here will directly inform adding a React frontend to the CLI tool. Rather than treating CLI and GUI as separate paradigms, this creates a unified vocabulary where applications are transparent and controllable by design - establishing foundational patterns that transcend individual projects and enable systematic, reproducible development workflows.

Three Main Benefits:

1. **Quicker, more familiar, reproducible development**  
   Affords a more rapid development process with Claude.
   It is impossible to communicate GUI behavior and differentiate logic faults of data with output changes in CSS formatting at times.

2. **End-to-end testing**  
   This makes End-to-end testing possible for the React frontend and the CLI backend.  This allows me to *forward propagate* a familiar testing architecture from **oshea** into **aoife**.
   
3. **React Frontend for oshea**  
   Greater value add is for **oshea**'s next phase of development, as I will be able to bolt on a React frontend, effectively *backward propagating* a web UI for doctype building and iteration (oshea's broader v1.0 to v2.0 goal).


### Graphical User Interface

Grid Evolution Sequence...

```
Stage 1: 1x1           Stage 2: 1x2           Stage 3: 2x2 (3 items)
┌─────┐               ┌─────┬─────┐          ┌─────┬─────┐
│ [0] │               │ [0] │ [1] │          │ [0] │ [1] │
└─────┘               └─────┴─────┘          ├─────┼─────┤
                                             │ [2] │  ?  │
                                             └─────┴─────┘

Stage 4: 2x2 (full)
┌─────┬─────┐
│ [0] │ [1] │
├─────┼─────┤
│ [2] │ [3] │
└─────┴─────┘
```

Matrix Indexing.
- Position [0] = (0,0) = top-left
- Position [1] = (0,1) = top-right
- Position [2] = (1,0) = bottom-left
- Position [3] = (1,1) = bottom-right

