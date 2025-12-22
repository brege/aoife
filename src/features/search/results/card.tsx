import type React from 'react';

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
}: CandidateCardProps) => (
  <button
    type="button"
    className={className}
    onClick={onClick}
    aria-label={ariaLabel}
    data-media-id={dataMediaId}
    data-media-title={dataMediaTitle}
  >
    {imageUrl ? (
      <img
        src={imageUrl}
        alt={imageAlt}
        className={imageClassName}
        onLoad={onImageLoad}
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
    {children}
  </button>
);
