import React from 'react';

/** The page's one arrow, drawn so it matches the weight of the type beside it. */
export const Arrow: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 16 16"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <path d="M2.5 8h11M9.5 4l4 4-4 4" />
  </svg>
);
