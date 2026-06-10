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
  const textColor = theme === 'dark' 
    ? 'bg-gradient-to-r from-white via-slate-200 to-slate-300 text-transparent bg-clip-text font-black' 
    : 'bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-transparent bg-clip-text font-black';
  const subColor = theme === 'dark' ? 'text-indigo-400 font-bold' : 'text-indigo-600 font-bold';

  // SVG representation of the exquisite, high-fidelity "V" glassmorphism icon
  const svgIcon = (
    <svg viewBox="0 0 500 450" className="w-full h-full drop-shadow-[0_4px_20px_rgba(56,189,248,0.15)]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Subtle radial ambient backend glow */}
        <radialGradient id="ambient-back-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* Primary V Left branch solid blue-to-indigo-purple gradient */}
        <linearGradient id="v-left-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="30%" stopColor="#0066FF" />
          <stop offset="75%" stopColor="#3B00E3" />
          <stop offset="100%" stopColor="#12005C" />
        </linearGradient>

        {/* Back glass capsule gradient (translucent cyan-to-royal-blue) */}
        <linearGradient id="glass-back-gradient" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.8" />
        </linearGradient>

        {/* Front glass capsule gradient (intense cyber cyan-to-purple-pink glass) */}
        <linearGradient id="glass-front-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="40%" stopColor="#0EA5E9" />
          <stop offset="75%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>

        {/* Shiny reflective/glossy border gradients */}
        <linearGradient id="glass-border-gradient-bright" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.32" />
          <stop offset="75%" stopColor="#38BDF8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#C084FC" stopOpacity="0.8" />
        </linearGradient>

        <linearGradient id="glass-border-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#818CF8" stopOpacity="0.45" />
        </linearGradient>

        {/* White specular glare diagonal shine */}
        <linearGradient id="glass-glare-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
          <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Ambient shadow specifically surrounding the layered glass plates */}
        <filter id="premium-glass-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="3" dy="14" stdDeviation="16" floodColor="#0EA5E9" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Background ambient bubble flare */}
      <circle cx="250" cy="180" r="160" fill="url(#ambient-back-glow)" />

      {/* 1. Left solid primary 'V' branch curving gracefully at the base */}
      <path
        d="M165,65 L235,265 C243,288 270,288 278,265"
        stroke="url(#v-left-gradient)"
        strokeWidth="56"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 2. Glassmorphic double stacked floating capsules on the right branch */}
      <g filter="url(#premium-glass-glow)">
        {/* Layer A: Back Translucent glass pane */}
        <rect
          x="265"
          y="65"
          width="54"
          height="195"
          rx="22"
          transform="rotate(23, 292, 162) translate(12, -18)"
          fill="url(#glass-back-gradient)"
          fillOpacity="0.75"
          stroke="url(#glass-border-gradient)"
          strokeWidth="1.5"
        />

        {/* Layer B: Front Glass Plate overlap */}
        <rect
          x="265"
          y="65"
          width="54"
          height="195"
          rx="22"
          transform="rotate(23, 292, 162)"
          fill="url(#glass-front-gradient)"
          fillOpacity="0.9"
          stroke="url(#glass-border-gradient-bright)"
          strokeWidth="2.5"
        />

        {/* Layer C: Linear glint overlay */}
        <path
          d="M266,74 L290,74 L274,250 L266,250 Z"
          transform="rotate(23, 292, 162)"
          fill="url(#glass-glare-gradient)"
          opacity="0.85"
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
            {/* Cyan accent slice inside V match */}
            <span className="absolute top-[8%] left-[10%] w-[34%] h-[28%] bg-[#00E5FF] rounded-[1px] transform -skew-x-[24deg] rotate-[6deg]" />
          </span>
          ITRION
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
            <span className="absolute top-[8%] left-[10%] w-[34%] h-[28%] bg-[#00E5FF] rounded-[1px] transform -skew-x-[24deg] rotate-[6deg]" />
          </span>
          ITRION
        </h2>
        <div className="h-1.5" />
        <p className={`${dimensions.sub} font-black ${subColor} uppercase font-sans leading-none tracking-[0.45em]`}>
          Smart Display
        </p>
      </div>
    </div>
  );
}

