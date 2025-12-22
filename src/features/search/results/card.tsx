import type React from 'react';
import { useEffect, useState } from 'react';

type CandidateCardProps = {
  className: string;
  onClick: () => void;
  ariaLabel: string;
  imageUrl?: string | null;
  imageAlt: string;
  imageClassName: string;
  placeholderClassName?: string;
  placeholderLabel?: string;
  onImageLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  onImageError?: () => void;
  crossOrigin?: 'anonymous' | 'use-credentials';
  aspectRatio?: number;
  dataMediaId?: string | number;
  dataMediaTitle?: string;
  children?: React.ReactNode;
};

export const CandidateCard = ({
  className,
  onClick,
  ariaLabel,
  imageUrl,
  imageAlt,
  imageClassName,
  placeholderClassName,
  placeholderLabel,
  onImageLoad,
  onImageError,
  crossOrigin,
  aspectRatio,
  dataMediaId,
  dataMediaTitle,
  children,
}: CandidateCardProps) => {
  const [imageDimensions, setImageDimensions] = useState<string | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setImageDimensions(null);
      return;
    }
    setImageDimensions(null);
  }, [imageUrl]);

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (naturalWidth > 0 && naturalHeight > 0) {
      setImageDimensions(`${naturalWidth}×${naturalHeight}`);
    }
    onImageLoad?.(event);
  };

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-label={ariaLabel}
      data-media-id={dataMediaId}
      data-media-title={dataMediaTitle}
    >
      <div className="candidate-image">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={imageAlt}
            className={imageClassName}
            onLoad={handleImageLoad}
            onError={onImageError}
            crossOrigin={crossOrigin}
            style={aspectRatio ? { aspectRatio } : undefined}
          />
        ) : (
          placeholderLabel &&
          placeholderClassName && (
            <div className={placeholderClassName}>{placeholderLabel}</div>
          )
        )}
        {imageDimensions && (
          <span className="candidate-image-dimensions">{imageDimensions}</span>
        )}
      </div>
      {children}
    </button>
  );
};
