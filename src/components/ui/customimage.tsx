import { useEffect, useState } from 'react';
import { createBlobURL, getImage, revokeBlobURL } from '../../lib/indexeddb';

interface CustomImageProps {
  src?: string;
  alt: string;
  className?: string;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  style?: React.CSSProperties;
}

export const CustomImage = ({
  src,
  alt,
  className,
  onLoad,
  style,
}: CustomImageProps) => {
  const [imageSrc, setImageSrc] = useState<string | undefined>(src);

  useEffect(() => {
    if (!src?.startsWith('img-')) {
      setImageSrc(src);
      return;
    }

    let blobUrl: string | null = null;

    const loadBlob = async () => {
      try {
        const blob = await getImage(src);
        if (blob) {
          blobUrl = createBlobURL(blob);
          setImageSrc(blobUrl);
        }
      } catch (error) {
        console.error('Failed to load image from IndexedDB:', error);
        setImageSrc(undefined);
      }
    };

    loadBlob();

    return () => {
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
      style={style}
    />
  );
};
