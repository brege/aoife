import type React from 'react';
import './close.css';

type CloseIconProps = {
  className?: string;
  title?: string;
};

const CloseIcon: React.FC<CloseIconProps> = ({
  className,
  title = 'Close icon',
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    className={className}
  >
    <title>{title}</title>
    <line x1="2" y1="2" x2="18" y2="18" />
    <line x1="2" y1="18" x2="18" y2="2" />
  </svg>
);

export default CloseIcon;
