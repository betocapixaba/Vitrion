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
    xs: { iconWidth: 'w-6 h-6', text: 'text-[9px] tracking-[0.24em]', sub: 'text-[4px] tracking-[0.38em]', gap: 'gap-1' },
    sm: { iconWidth: 'w-10 h-10', text: 'text-xs tracking-[0.24em]', sub: 'text-[5.5px] tracking-[0.44em]', gap: 'gap-1.5' },
    md: { iconWidth: 'w-24 h-24', text: 'text-xl tracking-[0.26em]', sub: 'text-[9px] tracking-[0.52em]', gap: 'gap-2.5' },
    lg: { iconWidth: 'w-36 h-36', text: 'text-3xl tracking-[0.28em]', sub: 'text-[11px] tracking-[0.62em]', gap: 'gap-4' },
    xl: { iconWidth: 'w-48 h-48', text: 'text-5xl tracking-[0.3em]', sub: 'text-xs tracking-[0.68em]', gap: 'gap-5' },
  }[size];

  // Colors based on theme
  const textColor = theme === 'dark' 
    ? 'bg-gradient-to-r from-white via-slate-100 to-indigo-100 text-transparent bg-clip-text font-black' 
    : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-transparent bg-clip-text font-black';
  const subColor = theme === 'dark' ? 'text-indigo-400 font-extrabold' : 'text-indigo-650 font-extrabold';

  // SVG representation of the exquisite, high-fidelity premium geometric smart TV symbol
  const svgIcon = (
    <svg viewBox="0 0 500 500" className="w-full h-full drop-shadow-[0_8px_32px_rgba(99,102,241,0.22)]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Deep ambient back-glow in purple/indigo */}
        <radialGradient id="lux-ambient-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.32" />
          <stop offset="60%" stopColor="#4F46E5" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* Outer glowing cyan gradient for futuristic halo */}
        <linearGradient id="halo-glow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#6366F1" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#D946EF" stopOpacity="0.4" />
        </linearGradient>

        {/* Left Prism segment - Solid cyber cyan-to-sapphire gradient */}
        <linearGradient id="prism-left-grad" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="35%" stopColor="#0EA5E9" />
          <stop offset="70%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>

        {/* Right Glass Overlay - High transparency electric magenta-purple gradient */}
        <linearGradient id="glass-right-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F472B6" stopOpacity="0.85" />
          <stop offset="30%" stopColor="#EC4899" stopOpacity="0.75" />
          <stop offset="70%" stopColor="#A855F7" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#6366F1" stopOpacity="0.9" />
        </linearGradient>

        {/* Sharp bright border sheen */}
        <linearGradient id="bright-rim-grad" x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.98" />
          <stop offset="25%" stopColor="#E0F2FE" stopOpacity="0.4" />
          <stop offset="70%" stopColor="#38BDF8" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#F472B6" stopOpacity="0.9" />
        </linearGradient>

        {/* Internal power core glow for "Smart Display" aspect */}
        <radialGradient id="amber-core-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FBBF24" stopOpacity="1" />
          <stop offset="40%" stopColor="#F59E0B" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
        </radialGradient>

        <filter id="ultra-drop-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="16" stdDeviation="24" floodColor="#4F46E5" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Layer 1: Ambient Backdrop Spark */}
      <circle cx="250" cy="250" r="210" fill="url(#lux-ambient-glow)" />

      {/* Layer 2: Decorative Calibration Orbital Rings (Thin, elegant lines of tech) */}
      <circle cx="250" cy="250" r="170" stroke="url(#halo-glow-grad)" strokeWidth="1.5" strokeDasharray="6, 12" />
      <circle cx="250" cy="250" r="135" stroke="#FFFFFF" strokeOpacity="0.08" strokeWidth="1" />
      
      {/* Precision corner alignment hash notches for high-fidelity TV display concept */}
      <path d="M125 125 L105 125 L105 145" stroke="#06B6D4" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.6" />
      <path d="M375 125 L395 125 L395 145" stroke="#F472B6" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.6" />
      <path d="M125 375 L105 375 L105 355" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.4" />
      <path d="M375 375 L395 375 L395 355" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.4" />

      {/* Layer 3: Left solid structural crystal facet of the "V" */}
      <g filter="url(#ultra-drop-shadow)">
        {/* Core solid 3D prismatic shape block */}
        <path
          d="M140 130 L222 360 C231 385 258 385 267 360"
          stroke="url(#prism-left-grad)"
          strokeWidth="62"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Internal neon bright light core to signify backlight & display technology */}
        <path
          d="M140 130 L222 360"
          stroke="#FFFFFF"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.35"
        />
      </g>

      {/* Layer 4: Floating Right Glassmorphic segment of the "V" with gorgeous overlay glare */}
      <g filter="url(#ultra-drop-shadow)">
        {/* Layer 4A: Back glass plate layer (adds incredible depth of field reflection) */}
        <rect
          x="272"
          y="105"
          width="62"
          height="225"
          rx="31"
          transform="rotate(22.8, 303, 217) translate(14, -20)"
          fill="#1E1B4B"
          fillOpacity="0.65"
          stroke="#475569"
          strokeWidth="1.5"
          strokeOpacity="0.5"
        />

        {/* Layer 4B: Primary Front glowing neon prism glass plate */}
        <rect
          x="272"
          y="105"
          width="62"
          height="225"
          rx="31"
          transform="rotate(22.8, 303, 217)"
          fill="url(#glass-right-grad)"
          stroke="url(#bright-rim-grad)"
          strokeWidth="3"
        />

        {/* Layer 4C: Specular gloss diagonal light streak */}
        <path
          d="M275 116 L310 116 L286 318 L275 318 Z"
          transform="rotate(22.8, 303, 217)"
          fill="#FFFFFF"
          fillOpacity="0.25"
        />
      </g>

      {/* Layer 5: High-Contrast Smart Amber Power Apex Core */}
      {/* This represents intelligence, broadcasting, and online active state of Vitrion */}
      <g transform="translate(245, 332)">
        <circle cx="20" cy="20" r="28" fill="url(#amber-core-glow)" />
        <circle cx="20" cy="20" r="10" fill="#FFFFFF" className="animate-pulse" />
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
      <div className={`inline-flex items-center gap-2 whitespace-nowrap ${className}`}>
        <div className="w-5.5 h-5.5 flex-shrink-0">
          {svgIcon}
        </div>
        <span className={`font-black text-[11px] tracking-[0.16em] leading-none ${textColor} uppercase font-sans flex items-center`}>
          <span className="relative inline-block mr-[2px]">
            V
            {/* Bright Cyan accent dynamic cut slice inside V */}
            <span className="absolute top-[8%] left-[10%] w-[34%] h-[28%] bg-[#06B6D4] rounded-[1px] transform -skew-x-[24deg] rotate-[6deg]" />
          </span>
          ITRION
          <span className="mx-2 opacity-40 font-normal">—</span>
          <span className={`text-[10px] font-extrabold tracking-[0.16em] ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-650'}`}>SMART DISPLAY</span>
        </span>
      </div>
    );
  }

  // Full brand presentation (Icon + Customized futuristic typographic wordmark)
  return (
    <div className={`flex flex-col items-center ${dimensions.gap} ${className}`}>
      {/* Brand Icon V */}
      <div className={`${dimensions.iconWidth} shrink-0`}>
        {svgIcon}
      </div>

      {/* Brand Typography Wordmark layout */}
      <div className="select-none text-center">
        <h2 className={`${dimensions.text} font-black uppercase font-sans flex items-center justify-center leading-none ${textColor}`}>
          <span className="relative inline-block mr-[3px]">
            V
            {/* High fidelity cyan segment slice */}
            <span className="absolute top-[8%] left-[10%] w-[34%] h-[28%] bg-[#06B6D4] rounded-[1px] transform -skew-x-[24deg] rotate-[6deg]" />
          </span>
          ITRION
        </h2>
        <div className="h-2" />
        <p className={`${dimensions.sub} font-black ${subColor} uppercase font-sans leading-none tracking-[0.45em] flex items-center justify-center gap-2`}>
          <span className="opacity-40 font-normal">—</span> SMART DISPLAY <span className="opacity-40 font-normal">—</span>
        </p>
      </div>
    </div>
  );
}


