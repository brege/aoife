## Roadmap

### Candidate Media Types

- **Board games** - BoardGameGeek API
- **Anime/Manga** - Jikan API

### Next Features

- **Move Posters"
  - allow user to drag and reorder posters
- **Captions and Overlays**
  - provide an editable caption for each title, overlay or underneath
- **Music Albums**
  - explore Fanart.tv API for better album art
- **Letterboxd Lists**
  - support bulk imports from friendly services

### Backend Resilience

1. Add nginx caching for `/api/gamesdb/*` JSON responses with short TTLs
   - coalesce identical requests with `proxy_cache_lock`
   - serve stale on upstream errors/timeouts
   - relax/drop cache /api/gamesdb/images/* (image bytes) when disk space is low

2. Add rate limiting that won’t trip fail2ban too early or during dev/benchmarking
   - prefer app-level limiting with `flask-limiter`
   - whitelist dev-machine WAN IP
