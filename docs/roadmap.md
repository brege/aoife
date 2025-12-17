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

- **Captions and Overlays**
  1. whether to provide an editable caption or description for each title
  2. options for persistent media type badge overlay

- **Music Albums**
  - explore Fanart.tv API for better album art

## Backend Resilience

1. Add nginx caching for `/api/gamesdb/*` JSON responses with short TTLs
   - coalesce identical requests with `proxy_cache_lock`
   - serve stale on upstream errors/timeouts
   - relax/drop cache /api/gamesdb/images/* (image bytes) when disk space is low

2. Add rate limiting that won’t trip fail2ban to early or during dev/benchmarking
   - prefer app-level limiting with `flask-limiter`
   - whitelist dev-machine IP
