## Roadmap

### Candidate Media Types

- **Board games** - BoardGameGeek API
- **Anime/Manga** - Jikan API

### Next Features

#### UX

**Posters** 
- ability to drag and reorder posters (research)
- poor swipe interface. make smoother (research)

#### Internals

**Consolidations** 
- extract reusable, generic card structure from the search result/picker elements
- unify the caption and custom url modals into a central edit modal

#### Providers

- **Music Albums**
  - inspiration: [beet's fetchart plugin](https://github.com/beetbox/beets/blob/master/beetsplug/fetchart.py)
  - support multiple sources
    1. multi-source art candidates with strict size/ratio filter
    2. collect *N=12* valid times *m* show-more's across sources
    3. store source name in metadata
- **Letterboxd Lists**
  - support bulk imports from friendly services

