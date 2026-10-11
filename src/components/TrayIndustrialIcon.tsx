import React from 'react';

interface TrayIndustrialIconProps {
  className?: string;
  size?: number;
}

export const TrayIndustrialIcon: React.FC<TrayIndustrialIconProps> = ({
  className = 'w-9 h-9',
  size = 200,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label="Tray 4-layer industrial icon"
      className={className}
    >
      <defs>
        <linearGradient id="trayOuterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
        <filter id="trayGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Layer 1: Outer thick ring - محيط الصينية */}
      <circle
        cx="100"
        cy="100"
        r="75"
        fill="none"
        stroke="url(#trayOuterGrad)"
        strokeWidth="12"
        strokeLinecap="round"
        opacity="0.95"
      />

      {/* Layer 2: Three dashed rings - Layers with colors */}
      {/* Outer dashed layer - yellow */}
      <circle
        cx="100"
        cy="100"
        r="60"
        fill="none"
        stroke="#fbbf24"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeDasharray="8 7"
        opacity="0.95"
      />
      {/* Middle dashed layer - green */}
      <circle
        cx="100"
        cy="100"
        r="44.5"
        fill="none"
        stroke="#10b981"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeDasharray="8 7"
        opacity="0.95"
      />
      {/* Inner dashed layer - cyan */}
      <circle
        cx="100"
        cy="100"
        r="29"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeDasharray="7 6"
        opacity="0.95"
      />

      {/* Layer 3: Center red dot - قطر آخر طبقة منطقة الخطر */}
      <circle
        cx="100"
        cy="100"
        r="13"
        fill="#ef4444"
        opacity="0.95"
        filter="url(#trayGlow)"
      />
      <circle cx="100" cy="100" r="4.5" fill="#ffffff" />
    </svg>
  );
};
