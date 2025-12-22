import { useEffect, useState } from 'react';
import { createBlobURL, getImage, revokeBlobURL } from '../lib/indexeddb';
import logger from '../lib/logger';

interface CustomImageProps {
  src?: string;
  alt: string;
  className?: string;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  crossOrigin?: 'anonymous' | 'use-credentials';
  style?: React.CSSProperties;
}

export const CustomImage = ({
  src,
  alt,
  className,
  onLoad,
  crossOrigin,
  style,
}: CustomImageProps) => {
  const [imageSrc, setImageSrc] = useState<string | undefined>(src);

  useEffect(() => {
    if (!src?.startsWith('img-')) {
      setImageSrc(src);
      return;
    }

    let blobUrl: string | null = null;
    let isActive = true;

    const loadBlob = async () => {
      try {
        const blob = await getImage(src);
        if (blob && isActive) {
          blobUrl = createBlobURL(blob);
          setImageSrc(blobUrl);
        }
      } catch (error) {
        logger.error('Failed to load image from IndexedDB', {
          context: 'CustomImage.loadBlob',
          error: error instanceof Error ? error.message : String(error),
          imageId: src,
        });
        if (isActive) {
          setImageSrc(undefined);
        }
      }
    };

    loadBlob();

    return () => {
      isActive = false;
      if (blobUrl) {
        revokeBlobURL(blobUrl);
      }
    };
  }, [src]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onLoad={onLoad}
      crossOrigin={crossOrigin}
      style={style}
    />
  );
};
