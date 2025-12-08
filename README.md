# aoife

A clean, responsive media collection tool for creating year-in-review, favorite films, etc galleries.

## Features

- Search and collect posters using different media APIs
- Dual-mode display: compact building mode and adaptive gallery view
- Responsive grid layout
- Alternate poster selection and editable title

## Examples

<table>
  <tr><td colspan="3"><b>Mobile</b></td></tr>
  <tr>
    <td><img src="docs/img/mobile-albums.png" width="180"></td>
    <td><img src="docs/img/mobile-films-builder.png" width="180"></td>
    <td><img src="docs/img/mobile-films.png" width="180"></td>
  </tr>
</table>


<br>

<table>
  <tr><td colspan="3"><b>Desktop</b></td></tr>
  <tr>
    <td colspan="2"><img src="docs/img/desktop-options.png" width="282"></td>
    <td><img src="docs/img/desktop-builder.png" width="283"></td>
  </tr>
</table>

No judgement please.

## Installation

```bash
npm install
npm run dev
```

Add your TMDB API key to `.env`:
```
VITE_TMDB_API_KEY=your_key_here
```

## Development

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

[roadmap](docs/roadmap.md)

### Changelog

[changelog](docs/changelog.md)

## License

[GPLv3](https://fsf.org/licensing/licenses/gpl-3.0)
