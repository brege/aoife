import type { MediaItem } from '../../providers/types';

const DEFAULT_ASPECT_RATIOS: Record<string, number> = {
  movies: 2 / 3,
  books: 2 / 3,
  music: 1,
};

const getCoverSource = (media: MediaItem) =>
  media.coverUrl || media.coverThumbnailUrl || '';

const getCaptionSubtitle = (media: MediaItem): string => {
  const yearText = media.year ? String(media.year) : '';
  if (media.subtitle && yearText && media.subtitle !== yearText) {
    return `${media.subtitle} - ${yearText}`;
  }
  if (media.subtitle) {
    return media.subtitle;
  }
  if (yearText) {
    return yearText;
  }
  return '';
};

const getCaptionTitle = (media: MediaItem): string => {
  if (typeof media.caption === 'string' && media.caption.trim() !== '') {
    return media.caption.trim();
  }
  return media.title;
};

const getAspectRatio = (media: MediaItem): number => {
  if (media.aspectRatio) return media.aspectRatio;
  return DEFAULT_ASPECT_RATIOS[media.type] ?? 2 / 3;
};

export {
  getAspectRatio,
  getCaptionSubtitle,
  getCaptionTitle,
  getCoverSource,
};
export { default } from './grid';
