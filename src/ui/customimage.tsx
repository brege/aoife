import { useEffect, useState } from 'react';
import { createBlobURL, getImage, revokeBlobURL } from '../lib/indexeddb';
import logger from '../lib/logger';

interface CustomImageProps {
  src?: string;
  alt: string;
  className?: string;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  crossOrigin?: 'anonymous' | 'use-credentials';
  style?: React.CSSProperties;
}

export const CustomImage = ({
  src,
  alt,
  className,
  onLoad,
  onError,
  crossOrigin,
  style,
}: CustomImageProps) => {
  const [imageSrc, setImageSrc] = useState<string | undefined>(
    src?.startsWith('img-') ? undefined : src,
  );

  useEffect(() => {
    if (!src?.startsWith('img-')) {
      setImageSrc(src);
      return;
    }

    let blobUrl: string | null = null;
    let isActive = true;
    setImageSrc(undefined);

    const loadBlob = async () => {
      try {
        const blob = await getImage(src);
        if (blob && isActive) {
          blobUrl = createBlobURL(blob);
          setImageSrc(blobUrl);
        }
      } catch (error) {
        logger.error(
          {
            context: 'CustomImage.loadBlob',
            error: error instanceof Error ? error.message : String(error),
            imageId: src,
          },
          'Failed to load image from IndexedDB',
        );
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
      onError={onError}
      crossOrigin={crossOrigin}
      style={style}
    />
  );
};
