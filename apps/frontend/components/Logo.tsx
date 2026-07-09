import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const PocketMintLogo: React.FC<LogoProps> = ({ className = "w-8 h-8", showText = true }) => {
  return (
    <div className="flex items-center gap-3">
      {/* SVG LOGO ICON 
        Menggunakan currentColor agar warnanya otomatis mengikuti class text Tailwind (contoh: text-white atau text-zinc-900)
      */}
      <svg 
        className={`shrink-0 ${className}`} 
        viewBox="0 0 32 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* The Sharp Pocket */}
        <path 
          d="M6 10V28H26V10" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="square"
        />
        {/* The Mint/Wealth Diamond */}
        <path 
          d="M16 4L22 10L16 16L10 10L16 4Z" 
          fill="currentColor"
        />
        {/* The Data/Card Lines */}
        <line x1="10" y1="20" x2="22" y2="20" stroke="currentColor" strokeWidth="2" />
        <line x1="10" y1="24" x2="18" y2="24" stroke="currentColor" strokeWidth="2" />
      </svg>

      {/* TYPOGRAPHY LOGO TEXT */}
      {showText && (
        <div className="flex flex-col justify-center">
          <span className="text-sm font-bold tracking-[0.2em] text-foreground uppercase leading-none">
            Pocket
          </span>
          <span className="text-sm font-bold tracking-[0.2em] text-muted-foreground uppercase leading-tight">
            Mint
          </span>
        </div>
      )}
    </div>
  );
};