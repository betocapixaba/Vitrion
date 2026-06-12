import React from 'react';
// @ts-ignore
import vitrionLogoOficial from '../assets/images/vitrion_logo_oficial.png';

interface VitrionLogoProps {
  variant?: 'full' | 'icon' | 'badge';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'dark' | 'light';
  className?: string;
}

export function VitrionLogo({ variant = 'full', size = 'md', theme = 'dark', className = '' }: VitrionLogoProps) {
  // Determine height or sizing class based on variant & size to fit cleanly in all standard UI boxes
  // without any distortion or cropping, keeping original proportion.
  const sizeClasses = {
    xs: 'h-8 max-w-full',
    sm: 'h-14 max-w-full',
    md: 'h-28 max-w-full',
    lg: 'h-40 max-w-full',
    xl: 'h-56 max-w-full',
  }[size];

  // Specific overrides for variant combinations to match the design's spacing requirements
  let finalClass = sizeClasses;
  if (variant === 'badge') {
    finalClass = 'h-6 sm:h-7 max-w-full';
  } else if (variant === 'icon' && size === 'xs') {
    finalClass = 'h-8 max-w-full';
  } else if (variant === 'icon' && size === 'sm') {
    finalClass = 'h-16 max-w-full';
  }

  return (
    <img
      src={vitrionLogoOficial}
      alt="Vitrion Smart Display Logo"
      className={`object-contain transition-all duration-300 ${finalClass} ${className}`}
      referrerPolicy="no-referrer"
    />
  );
}



