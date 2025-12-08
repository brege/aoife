# Roadmap

**aoife** is a poster and artwork display tool. 

It currently supports movies, TV shows, books, and music albums. Each can be searched via their respective APIs, alternate covers can be selected, and custom entries can be added manually.

The goal is to support more media types without constant rebuilding of the core system. The architecture is already there: a pluggable service layer, a responsive grid that adapts to different aspect ratios, and a custom entry fallback.

## Next Sources

- **Video games** - IGDB or similar API
- **Board games** - BoardGameGeek API
- **Anime/Manga** - Jikan API
- **Apps/Software** - Custom entries only (user provides cover image)
- **Articles/Bookmarks/Websites** - Generic custom media type; user finds and uploads cover

## Next Features

- **Shareable URLs** - Make grids shareable via hash slug so users can bookmark/share them
- **Captions and Overlays** 
  1. whether to provide an editable caption or description for each title
  2. options for persistant media type badge overlay

## Challenges

- Decide if this is an authentication app or just a public builder
- Decide what the server caches (or store if shared URL is generated)
