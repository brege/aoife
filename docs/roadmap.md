# Roadmap

**aoife** is a poster and artwork display tool.

| Media Types  | APIs                      |
|:-------------|:--------------------------|
| movies       | TMDb                      |
| TV shows     | TMDb                      |
| books        | OpenLibrary, Google Books |
| music albums | MusicBrainz               |
| video games  | GamesDB                   |
| custom media | Manual Upload, URL        |

The goal is to support more media types without constant rebuilding of the core system. 

## Candidate Media Types

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
