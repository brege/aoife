# Roadmap

**aoife** is a poster and artwork display tool. 

It currently supports movies, TV shows, books, music albums, video games, and custom media. Each can be searched via their respective APIs, alternate covers can be selected, and custom entries can be added with manual image uploads or image URLs.

The goal is to support more media types without constant rebuilding of the core system. The architecture provides: a pluggable service layer, a responsive grid that adapts to different aspect ratios, and a custom entry fallback.

## Candidate Next Sources

- **Board games** - BoardGameGeek API
- **Anime/Manga** - Jikan API

## Next Features

- **Shareable URLs** - Make grids shareable via hash slug so users can bookmark/share them
  - will require persistent storage on server-side
- **Captions and Overlays**
  1. whether to provide an editable caption or description for each title
  2. options for persistant media type badge overlay

## Challenges

- Decide if this is an app requiring authentication or just a public one-time builder
- Decide how the server persists if shareable URLs are implemented
