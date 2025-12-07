import React from 'react';
import './close.css';

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <line x1="2" y1="2" x2="18" y2="18" />
    <line x1="2" y1="18" x2="18" y2="2" />
  </svg>
);

export default CloseIcon;
