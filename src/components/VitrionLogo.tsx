import React from 'react';

interface VitrionLogoProps {
  variant?: 'full' | 'icon' | 'badge';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'dark' | 'light';
  className?: string;
}

export function VitrionLogo({ variant = 'full', size = 'md', theme = 'dark', className = '' }: VitrionLogoProps) {
  // Dimensions based on size preset
  const dimensions = {
    xs: { iconWidth: 'w-6 h-6', text: 'text-[9px] tracking-[0.24em]', sub: 'text-[4.5px] tracking-[0.38em]', gap: 'gap-1' },
    sm: { iconWidth: 'w-10 h-10', text: 'text-xs tracking-[0.24em]', sub: 'text-[5.5px] tracking-[0.44em]', gap: 'gap-1.5' },
    md: { iconWidth: 'w-24 h-24', text: 'text-xl tracking-[0.26em]', sub: 'text-[9px] tracking-[0.52em]', gap: 'gap-2.5' },
    lg: { iconWidth: 'w-36 h-36', text: 'text-3xl tracking-[0.28em]', sub: 'text-[11px] tracking-[0.62em]', gap: 'gap-4' },
    xl: { iconWidth: 'w-48 h-48', text: 'text-5xl tracking-[0.3em]', sub: 'text-xs tracking-[0.68em]', gap: 'gap-5' },
  }[size];

  // Colors based on theme
  const textColor = theme === 'dark' ? 'text-slate-100' : 'text-[#01142F]';
  const subColor = theme === 'dark' ? 'text-indigo-300/90' : 'text-[#7C3AED]/90';

  // SVG representation of the premium "V" icon with twin glossy glass panels and purple gradient bend
  const svgIcon = (
    <svg viewBox="0 0 500 450" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Left Dark Segment (Premium Navy/Midnight Blue Gradient) */}
        <linearGradient id="left-segment-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1B2F4E" />
          <stop offset="50%" stopColor="#0B1526" />
          <stop offset="100%" stopColor="#020813" />
        </linearGradient>

        {/* Back Stack Glass Reflection (Cyan/Vibrant Sky Blue) */}
        <linearGradient id="glassy-back-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#AFECFF" />
          <stop offset="30%" stopColor="#1DA1F2" />
          <stop offset="100%" stopColor="#0E5CAD" stopOpacity="0.8" />
        </linearGradient>

        {/* Front Stack Glass Plate (Exact: Aqua Top -> Sky Blue Center -> Intense Purple Crease Base) */}
        <linearGradient id="glassy-front-grad" x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor="#67E8F9" /> {/* Bright Cyan Aqua */}
          <stop offset="25%" stopColor="#38BDF8" /> {/* Lucid Sky Blue */}
          <stop offset="60%" stopColor="#2563EB" /> {/* Intense Royal Blue */}
          <stop offset="85%" stopColor="#7C3AED" /> {/* Premium Royal Violet */}
          <stop offset="100%" stopColor="#C026D3" /> {/* Fuchsia highlight crease */}
        </linearGradient>

        {/* Glossy Edge Highlight (Semi-transparent White) */}
        <linearGradient id="border-gloss-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.2" />
          <stop offset="80%" stopColor="#818CF8" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.1" />
        </linearGradient>

        {/* Inner Glass Flare Reflection Accent */}
        <linearGradient id="glassy-reflection" x1="20%" y1="10%" x2="80%" y2="90%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
        </linearGradient>

        {/* Professional Ambient Glow Filter */}
        <filter id="logo-ambient-drop" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="2" dy="22" stdDeviation="24" floodColor="#3B82F6" floodOpacity="0.32" />
        </filter>
      </defs>

      {/* 1. Left Dark Charcoal/Navy "V" leg - slanted down with refined curved base bend */}
      <path 
        d="M172 74 L244 326 C248 338 258 344 268 344 L325 344" 
        stroke="url(#left-segment-grad)" 
        strokeWidth="76" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      {/* 2. Glassy stacked twin right-leg overlay for hyper-realistic 3D look in the image */}
      <g filter="url(#logo-ambient-drop)">
        {/* Layer A: Back Translucent Glass Plate - Slightly smaller/offset top-right */}
        <rect 
          x="278" 
          y="56" 
          width="90" 
          height="254" 
          rx="25" 
          transform="skewX(-17.5) rotate(-3.5 258 70)" 
          fill="url(#glassy-back-grad)" 
          fillOpacity="0.8"
          stroke="url(#border-gloss-grad)"
          strokeWidth="3"
        />

        {/* Layer B: Front Core Glossy Glass Plate - Exact match to the primary slanted plate */}
        <rect 
          x="254" 
          y="72" 
          width="92" 
          height="256" 
          rx="25" 
          transform="skewX(-17.5) rotate(-3.5 258 70)" 
          fill="url(#glassy-front-grad)" 
          stroke="url(#border-gloss-grad)"
          strokeWidth="4.5" 
        />

        {/* Layer C: Specular Slash Highlight (glossy shine running down diagonally) */}
        <path 
          d="M258 73 L312 73 L274 326 L244 326 Z"
          transform="skewX(-17.5) rotate(-3.5 258 70)" 
          fill="url(#glassy-reflection)"
          opacity="0.65"
          style={{ mixBlendMode: 'overlay' }}
        />
      </g>
    </svg>
  );

  if (variant === 'icon') {
    return (
      <div className={`relative ${dimensions.iconWidth} ${className}`}>
        {svgIcon}
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className="w-5.5 h-5.5 flex-shrink-0">
          {svgIcon}
        </div>
        <span className={`font-black text-[11px] tracking-[0.24em] leading-none ${textColor} uppercase font-sans flex items-center`}>
          <span className="relative inline-block mr-[2px]">
            V
            {/* Exactly placed Cyan accent slice on the V */}
            <span className="absolute top-[8%] left-[10%] w-[34%] h-[28%] bg-[#0EA5E9] rounded-[1px] transform -skew-x-[24deg] rotate-[6deg]" />
          </span>
          ITRION
        </span>
      </div>
    );
  }

  // Full representation (Icon + Title with Cyan Accent Slice + wide tagline)
  return (
    <div className={`flex flex-col items-center ${dimensions.gap} ${className}`}>
      {/* V Graphical Mark */}
      <div className={`${dimensions.iconWidth} shrink-0`}>
        {svgIcon}
      </div>

      {/* Exact Custom Brand Wordmark Typography */}
      <div className="select-none text-center">
        <h2 className={`${dimensions.text} font-black ${textColor} uppercase font-sans flex items-center justify-center leading-none`}>
          <span className="relative inline-block mr-[3px]">
            V
            {/* Exactly simulated Cyan slanted slash inside V to match uploaded logo */}
            <span className="absolute top-[8%] left-[10%] w-[34%] h-[28%] bg-[#0EA5E9] rounded-[1px] transform -skew-x-[24deg] rotate-[6deg]" />
          </span>
          ITRION
        </h2>
        <div className="h-1.5" />
        <p className={`${dimensions.sub} font-bold ${subColor} uppercase font-sans leading-none tracking-[0.45em]`}>
          Smart Display
        </p>
      </div>
    </div>
  );
}

