## Contributors

### Infrastructure

- React + TypeScript
- Vite for build and development; Gunicorn for production
- CSS Grid for responsive layouts
- Cypress layers for AI-development and testing
- Biome for linting, formatting, and type checking
- Ruff for backend python linting
- Mocha for test orchestration

### APIs

- TMDB API for movie/TV data
- MusicBrainz, iTunes, and CoverArtArchive for music
- OpenLibrary and Google Books APIs for books
- TheGamesDB for video games

| Media Types  | APIs                                        |
|:-------------|:--------------------------------------------|
| movies       | TMDb                                        |
| TV shows     | TMDb                                        |
| books        | OpenLibrary, Google Books                   |
| music albums | MusicBrainz, iTunes, CoverArtArchive        |
| video games  | TheGamesDB                                  |
| custom media | Manual Upload, URL upload                   |

### Commands

```bash
npm run dev     # start development server
npm run build   # build for production
npm run lint    # run biome linter
npm run test    # run all tests (:e2e, :integration)
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

Current tests (YAML-driven workflows):
- `grid_operations`: add, remove, retrieve operations with custom items
- `search_and_add_workflows`: TMDB search (movies, TV) and add-from-search
- `layout_dimension`: layout toggle between fixed width and height
- `grid_persistence`: verify grid clears and persists across reload

Coverage (✔ = covered, ○ = missing):
| Media type | Search | Add from search | Add custom | Remove | Grid fetch | Persistence |
| ---------- | ------ | --------------- | ---------- | ------ | ---------- | ----------- |
| Movies     | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| TV         | ✔ | ○ | ✔ | ✔ | ✔ | ○ |
| Custom     | ○ | ○ | ✔ | ✔ | ✔ | ✔ |
| Music      | ○ | ○ | ✔ | ○ | ○ | ○ |
| Books      | ○ | ○ | ○ | ○ | ○ | ○ |
| Games      | ○ | ○ | ○ | ○ | ○ | ○ |

### slugs.json

To regenerate the shared slug vocabulary from the flavor network dataset:

```bash
curl -s https://flavorpair.me/data/flavor/nodes.json \
  | jq '[.[] | select(.id | test("^[a-zA-Z0-9]+$")) | .id]' \
  > src/lib/slugs.json
```

Inspecting the Shared URL database remotely:

```bash
./inspect -h
#  inspect [-s <slug-fragment> | -n <count>] [-r | -f <path>]
```

Examples:
```bash
./inspect -s chanterelle -r       # urls slugs containing 'chanterelle' on remote
./inspect -n 10 -f                # last 10 urls generated (local json)
```

I will be migrating from JSON storage to a SQL database once development has stabilized.
