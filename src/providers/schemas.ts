import { z } from 'zod';

// TMDB schemas

export const TmdbResultSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  name: z.string().optional(),
  release_date: z.string().optional(),
  first_air_date: z.string().optional(),
  poster_path: z.string().nullable().optional(),
});

export type TmdbResult = z.infer<typeof TmdbResultSchema>;

export const TmdbSearchResponseSchema = z.object({
  results: z.array(TmdbResultSchema),
});

export const TmdbDetailsSchema = TmdbResultSchema.extend({
  imdb_id: z.string().nullable().optional(),
});

export type TmdbDetails = z.infer<typeof TmdbDetailsSchema>;

export const TmdbPosterSchema = z.object({
  file_path: z.string(),
});

export const TmdbImagesResponseSchema = z.object({
  posters: z.array(TmdbPosterSchema).optional(),
});

// TheGamesDB schemas

export const GameSchema = z.object({
  id: z.number(),
  game_title: z.string(),
  release_date: z.string().optional(),
  overview: z.string().optional(),
  rating: z.number().optional(),
});

export type Game = z.infer<typeof GameSchema>;

export const GameImageSchema = z.object({
  id: z.number(),
  type: z.string(),
  side: z.string().nullable().optional(),
  filename: z.string(),
  resolution: z.string().nullable().optional(),
});

export type GameImage = z.infer<typeof GameImageSchema>;

export const ImageBaseUrlSchema = z.object({
  original: z.string().optional(),
  small: z.string().optional(),
  thumb: z.string().optional(),
  cropped_center_thumb: z.string().optional(),
  medium: z.string().optional(),
  large: z.string().optional(),
});

export type ImageBaseUrl = z.infer<typeof ImageBaseUrlSchema>;

export const GamesSearchResponseSchema = z.object({
  data: z.object({
    games: z.array(GameSchema).optional(),
  }),
});

export const GamesImagesResponseSchema = z.object({
  data: z.object({
    base_url: ImageBaseUrlSchema.optional(),
    images: z.record(z.string(), z.array(GameImageSchema)).optional(),
  }),
});

// OpenLibrary schemas

export const OpenLibraryResultSchema = z.object({
  title: z.string(),
  author_name: z.array(z.string()).optional(),
  first_publish_year: z.number().optional(),
  cover_i: z.number().optional(),
  edition_count: z.number().optional(),
  isbn: z.array(z.string()).optional(),
  language: z.array(z.string()).optional(),
  has_fulltext: z.boolean().optional(),
  key: z.string().optional(),
  ia: z.array(z.string()).optional(),
});

export type OpenLibraryResult = z.infer<typeof OpenLibraryResultSchema>;

export const OpenLibrarySearchResponseSchema = z.object({
  numFound: z.number(),
  docs: z.array(OpenLibraryResultSchema),
});

export const OpenLibraryWorkSchema = z.object({
  title: z.string().optional(),
  first_publish_date: z.string().optional(),
  covers: z.array(z.number()).optional(),
  description: z
    .union([z.string(), z.object({ value: z.string() })])
    .optional(),
  subjects: z.array(z.string()).optional(),
});

// Google Books schemas

export const GoogleBooksImageLinksSchema = z.object({
  thumbnail: z.string().optional(),
  smallThumbnail: z.string().optional(),
  medium: z.string().optional(),
  large: z.string().optional(),
});

export const GoogleBooksVolumeInfoSchema = z.object({
  title: z.string().optional(),
  authors: z.array(z.string()).optional(),
  publishedDate: z.string().optional(),
  imageLinks: GoogleBooksImageLinksSchema.optional(),
  description: z.string().optional(),
  pageCount: z.number().optional(),
  categories: z.array(z.string()).optional(),
  language: z.string().optional(),
  infoLink: z.string().optional(),
  previewLink: z.string().optional(),
  industryIdentifiers: z
    .array(
      z.object({
        type: z.string(),
        identifier: z.string(),
      }),
    )
    .optional(),
  averageRating: z.number().optional(),
  ratingsCount: z.number().optional(),
  publisher: z.string().optional(),
});

export type GoogleBooksVolumeInfo = z.infer<typeof GoogleBooksVolumeInfoSchema>;

export const GoogleBooksVolumeSchema = z.object({
  id: z.string(),
  volumeInfo: GoogleBooksVolumeInfoSchema,
});

export type GoogleBooksVolume = z.infer<typeof GoogleBooksVolumeSchema>;

export const GoogleBooksSearchResponseSchema = z.object({
  totalItems: z.number(),
  items: z.array(GoogleBooksVolumeSchema).optional(),
});

// MusicBrainz schemas

export const MusicBrainzArtistCreditSchema = z.object({
  name: z.string(),
  artist: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

export const MusicBrainzReleaseGroupSchema = z.object({
  id: z.string(),
  'primary-type': z.string().optional(),
});

export const MusicBrainzLabelInfoSchema = z.object({
  'catalog-number': z.string().optional(),
  label: z.object({ name: z.string() }).optional(),
});

export const MusicBrainzCoverArtArchiveSchema = z.object({
  front: z.boolean().optional(),
  artwork: z.boolean().optional(),
  count: z.number().optional(),
});

export const MusicBrainzReleaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string().optional(),
  country: z.string().optional(),
  'artist-credit': z.array(MusicBrainzArtistCreditSchema).optional(),
  'cover-art-archive': MusicBrainzCoverArtArchiveSchema.optional(),
  'release-group': MusicBrainzReleaseGroupSchema.optional(),
  'label-info': z.array(MusicBrainzLabelInfoSchema).optional(),
});

export type MusicBrainzRelease = z.infer<typeof MusicBrainzReleaseSchema>;

export const MusicBrainzSearchResponseSchema = z.object({
  created: z.string(),
  count: z.number(),
  offset: z.number(),
  releases: z.array(MusicBrainzReleaseSchema),
});

export const CoverArtArchiveImageSchema = z.object({
  front: z.boolean().optional(),
  image: z.string().optional(),
  thumbnails: z
    .object({
      small: z.string().optional(),
      large: z.string().optional(),
    })
    .optional(),
});

export const CoverArtArchiveMetadataResponseSchema = z.object({
  images: z.array(CoverArtArchiveImageSchema).optional(),
});

export type CoverArtArchiveMetadataResponse = z.infer<
  typeof CoverArtArchiveMetadataResponseSchema
>;

export const iTunesResultSchema = z.object({
  artistName: z.string().optional(),
  artworkUrl100: z.string().optional(),
  collectionName: z.string().optional(),
});

export const iTunesSearchResponseSchema = z.object({
  resultCount: z.number(),
  results: z.array(iTunesResultSchema),
});
