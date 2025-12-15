## Contributors

### Infrastructure

- React + TypeScript
- Vite for build and development
- CSS Grid for responsive layouts
- Cypress layers for AI-development and testing
- Biome for linting, formatting, and type checking

### APIs

- TMDB API for movie/TV data
- Musicbrainz API for music
- OpenLibrary and Google Books API's books
- Many more to be added

### Commands

```bash
npm run dev     # start development server
npm run build   # build for production
npm run lint    # run biome linter
```

### API Endpoints

With `npm run dev` running, use the HTTP API to interact programmatically:

```bash
# Search
curl "http://localhost:8080/api/search?q=dune&type=movies"

# Add media item
curl -X POST http://localhost:8080/api/add \
  -H "Content-Type: application/json" \
  -d '{"id":"1","type":"movies","title":"Dune","year":2021,"coverUrl":"https://..."}'

# Add first search result
curl -X POST http://localhost:8080/api/add-first/parasite

# Remove item
curl -X DELETE http://localhost:8080/api/remove/1

# Get grid state
curl http://localhost:8080/api/grid

# Clear all items
curl -X DELETE http://localhost:8080/api/clear
```

### Roadmap

[roadmap](roadmap.md)

### Changelog

[changelog](changelog.md)

### Test Coverage Matrix

This section is currently evolving and breaking.

Current tests:
- `grid_operations`: 
  - search add TITLE
  - search add TITLE
  - remove both via UI
  - verify grid state
- `search_and_add_workflows`: 
  - search movies TITLE
  - search+add-first-result TITLE
  - search TV TITLE

Coverage (✔ = covered, ○ = missing):
| Media type | Search | Add from search | Add custom | Remove | Grid fetch |
| ---------- | ------ | --------------- | ---------- | ------ | ---------- |
| Movies     | ✔ | ✔ | ○ | ○ | ○ |
| TV         | ✔ | ○ | ○ | ○ | ○ |
| Custom     | ○ | ○ | ✔ | ✔ | ✔ |
| Books      | ○ | ○ | ○ | ○ | ○ |
| Music      | ○ | ○ | ○ | ○ | ○ |
| Games      | ○ | ○ | ○ | ○ | ○ |

