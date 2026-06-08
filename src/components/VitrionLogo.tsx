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
    xs: { iconWidth: 'w-6 h-6', text: 'text-[9px] tracking-[0.16em]', sub: 'text-[4.5px] tracking-[0.3em]', gap: 'gap-1' },
    sm: { iconWidth: 'w-10 h-10', text: 'text-xs tracking-[0.18em]', sub: 'text-[6px] tracking-[0.38em]', gap: 'gap-1.5' },
    md: { iconWidth: 'w-20 h-20', text: 'text-lg tracking-[0.22em]', sub: 'text-[8.5px] tracking-[0.48em]', gap: 'gap-2' },
    lg: { iconWidth: 'w-32 h-32', text: 'text-3xl tracking-[0.24em]', sub: 'text-xs tracking-[0.58em]', gap: 'gap-3.5' },
    xl: { iconWidth: 'w-44 h-44', text: 'text-4.5xl tracking-[0.26em]', sub: 'text-sm tracking-[0.64em]', gap: 'gap-4' },
  }[size];

  // Colors based on theme
  const textColor = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const subColor = theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600/80';

  // SVG representation of the stunning "V" icon from image
  const svgIcon = (
    <svg viewBox="0 0 500 450" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Left Dark Structural Path (Navy Blue / Deep Charcoal) */}
        <linearGradient id="left-segment" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#25354c" />
          <stop offset="60%" stopColor="#121a28" />
          <stop offset="100%" stopColor="#040810" />
        </linearGradient>

        {/* Right Glassy Screen Path (Bright Vibrant Cyan/Blue Gradient) */}
        <linearGradient id="glassy-right" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5ae0ff" />
          <stop offset="42%" stopColor="#0091ff" />
          <stop offset="100%" stopColor="#5552fa" />
        </linearGradient>

        {/* Specular White Gloss Highlight Border */}
        <linearGradient id="specular-gloss" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#5552fa" stopOpacity="0.7" />
        </linearGradient>

        {/* Translucent Overlay Glare reflection */}
        <linearGradient id="glare-reflection" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
        </linearGradient>

        {/* Drop glow shadow to look like a real smart display in the dark */}
        <filter id="vector-glow" x="-20%" y="-20%" width="140%" height="145%">
          <feDropShadow dx="3" dy="16" stdDeviation="15" floodColor="#0080ff" floodOpacity="0.32" />
        </filter>
      </defs>

      {/* 1. Left Dark Charcoal "V" leg - slanted down with refined round cap and bottom edge */}
      <path 
        d="M170 80 L238 332 C242 344 252 350 262 350 L315 350" 
        stroke="url(#left-segment)" 
        strokeWidth="78" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      {/* 2. Glassy Cyan/Blue Right Display Leg overlay - slanted forward, skew angles, curved corners */}
      <g filter="url(#vector-glow)">
        {/* Soft under-shadow backing */}
        <rect 
          x="255" 
          y="76" 
          width="98" 
          height="266" 
          rx="26" 
          transform="skewX(-17) rotate(-3 255 76)" 
          fill="#0055ff" 
          opacity="0.25" 
        />
        {/* Main core screen */}
        <rect 
          x="258" 
          y="70" 
          width="94" 
          height="260" 
          rx="24" 
          transform="skewX(-17) rotate(-3 258 70)" 
          fill="url(#glassy-right)" 
          stroke="url(#specular-gloss)"
          strokeWidth="4.5" 
        />
        {/* Inner glass glossy highlight split */}
        <path 
          d="M264 72 L320 72 L278 322 L248 322 Z"
          transform="skewX(-17) rotate(-3 258 70)" 
          fill="url(#glare-reflection)"
          opacity="0.5"
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
        <div className="w-5 h-5 flex-shrink-0">
          {svgIcon}
        </div>
        <span className={`font-black text-[11px] tracking-widest leading-none ${textColor} uppercase font-sans`}>
          V
          <span className="relative text-cyan-400">
            I
            <span className="absolute -top-[15%] left-[20%] w-[100%] h-[30%] bg-cyan-400 rounded-full transform -skew-x-[20deg]" />
          </span>
          TRION
        </span>
      </div>
    );
  }

  // Full representation (Icon + Typography Title + Tagline Subtitle)
  return (
    <div className={`flex flex-col items-center ${dimensions.gap} ${className}`}>
      {/* V Graphical Mark */}
      <div className={`${dimensions.iconWidth} shrink-0`}>
        {svgIcon}
      </div>

      {/* Exact Typography reproduction */}
      <div className="select-none text-center">
        <h2 className={`${dimensions.text} font-black tracking-[0.24em] ${textColor} uppercase font-sans flex items-center justify-center leading-none`}>
          V
          <span className="relative inline-block text-cyan-400">
            I
            {/* The cyan slanted accent mark exactly matched to the uploaded image */}
            <span className="absolute -top-[13%] -left-[12%] w-[124%] h-[26%] bg-cyan-400 rounded-sm transform -skew-x-[26deg] rotate-[6deg]" />
          </span>
          TRION
        </h2>
        <div className="h-1.5" />
        <p className={`${dimensions.sub} font-bold ${subColor} uppercase font-sans leading-none`}>
          Smart Display
        </p>
      </div>
    </div>
  );
}
