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

0. **Aspect Ratios**  
   - Movies, TV Shows: 2:3
   - Books: 2:3 (or other)
   - Music Albums: 1:1  
   The grid system must support media‑type aware CSS to properly display collections.  

1. **Service Layer Abstraction**  
   Current movie logic is hardcoded to TMDB. This should become a pluggable service interface, e.g.:  
   ```typescript
   interface MediaService {
     search(query: string): Promise<MediaItem[]>;
     getAlternateCovers(id: string): Promise<string[]>;
   }
   ```

2. **Media Type Selection**  
   A header selector for `Movies | Books | Music` will allow a user to switch views cleanly.

   This could also include the build-up for a userspace configuration method. I will have to decide when to support user accounts--extending beyond local storage--and if the tool and my approach to React have made this doable.  
   
   The potential for screwing this up into an impossible refactor (like oshea's CJS to ESM proof)
   later is high; I will have to keep this adaptability in mind, catching myself early.

3. **Collection Strategy**  
   - **Mixed collections**: More complex UI, but flexibility for users who want a single all‑media shelf.  
   - **Separate collections**: Easier to implement, provides clarity by type.  
   This choice will affect UX heavily and should be made early as well.

4. **Custom Entry Extension**  
   Adapt the existing “add a movie” custom input form so that it also works for books and albums, ensuring manual creation is first‑class across types.  

#### Summary

The project's near‑term path is clear: add support for books and music, use their differences to drive real architectural improvements, and maintain the flexibility of custom media creation. Once these steps are complete, the foundation will be strong enough to revisit secondary categories like TV shows or games without risking brittle code or wasted design effort.

---

### Logging & API Foundation

- [x] Port `oshea`'s centralized logging system
- [x] Browser→server log streaming via Vite middleware
- [x] Real-time terminal visibility of user actions

Track events, not keystrokes.

- [x] Poster selection changes (different poster chosen)
- [x] Hamburger menu selections  
- [x] Header bar title changes (if user modifies **aoife**)
- [ ] Grid operations (add/remove items) 
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
