const averageHashSize = 8;
const averageHashThreshold = 6;

let placeholderHash: string | null = null;

const loadPlaceholderHash = () => {
  if (typeof window === 'undefined') {
    return;
  }
  const placeholderImage = new Image();
  placeholderImage.src = '/placeholder.webp';
  placeholderImage.addEventListener('load', () => {
    placeholderHash = computeAverageHash(placeholderImage);
  });
};

const computeAverageHash = (image: HTMLImageElement): string => {
  const canvas = document.createElement('canvas');
  canvas.width = averageHashSize;
  canvas.height = averageHashSize;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Canvas context is unavailable');
  }
  context.drawImage(image, 0, 0, averageHashSize, averageHashSize);
  const imageData = context.getImageData(
    0,
    0,
    averageHashSize,
    averageHashSize,
  );
  const data = imageData.data;
  const luminance: number[] = [];

  for (let i = 0; i < data.length; i += 4) {
    const red = data[i] ?? 0;
    const green = data[i + 1] ?? 0;
    const blue = data[i + 2] ?? 0;
    luminance.push((red + green + blue) / 3);
  }

  const average =
    luminance.reduce((sum, value) => sum + value, 0) / luminance.length;
  return luminance.map((value) => (value >= average ? '1' : '0')).join('');
};

const getHammingDistance = (left: string, right: string): number => {
  if (left.length !== right.length) {
    throw new Error('Hash lengths do not match');
  }
  let distance = 0;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) {
      distance += 1;
    }
  }
  return distance;
};

loadPlaceholderHash();

export const isPlaceholderCover = (image: HTMLImageElement): boolean => {
  if (!placeholderHash) {
    return false;
  }
  if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
    return false;
  }
  const candidateHash = computeAverageHash(image);
  const distance = getHammingDistance(placeholderHash, candidateHash);
  return distance <= averageHashThreshold;
};
