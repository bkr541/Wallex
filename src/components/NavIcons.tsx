import React from 'react';

// 1. Overview / Dashboard Home Icon
export function OverviewIcon({ className = "w-5 h-5", strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 10.5L12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20v-9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

// 2. Chords Music Notes Icon (Double eighth note connected by beam)
export function ChordsIcon({ className = "w-5 h-5", strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="8" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
      <path d="M11 18V6l10-2v12" />
    </svg>
  );
}

// 3. Camelot Wheel Icon (Harmonic color wheel with 12 segments and center cutout)
export function CamelotWheelIcon({ className = "w-6 h-6" }: { className?: string }) {
  // 12 segments representing the 12 keys of the Camelot wheel (8B, 9B, 10B, etc.)
  const colors = [
    '#EF4444', // Red
    '#F97316', // Orange
    '#F59E0B', // Amber
    '#EAB308', // Yellow
    '#84CC16', // Lime
    '#10B981', // Emerald
    '#06B6D4', // Cyan
    '#0EA5E9', // Sky
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Purple
    '#EC4899', // Pink
  ];

  return (
    <svg viewBox="0 0 32 32" className={className}>
      <defs>
        <mask id="camelot-center-mask">
          <rect x="0" y="0" width="32" height="32" fill="white" />
          <circle cx="16" cy="16" r="6.5" fill="black" />
        </mask>
      </defs>
      <g mask="url(#camelot-center-mask)">
        {colors.map((color, index) => {
          const startAngle = (index * 30 - 90) * (Math.PI / 180);
          const endAngle = ((index + 1) * 30 - 90) * (Math.PI / 180);
          const r = 14;
          const x1 = 16 + r * Math.cos(startAngle);
          const y1 = 16 + r * Math.sin(startAngle);
          const x2 = 16 + r * Math.cos(endAngle);
          const y2 = 16 + r * Math.sin(endAngle);
          
          return (
            <path
              key={index}
              d={`M 16 16 L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
              fill={color}
            />
          );
        })}
      </g>
      {/* Outer subtle ring */}
      <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
      {/* Inner subtle ring */}
      <circle cx="16" cy="16" r="6.5" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
    </svg>
  );
}

// 4. MIDI Piano Keyboard Icon
export function MidiIcon({ className = "w-5 h-5", strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Piano Outer casing */}
      <rect x="3" y="6" width="18" height="12" rx="2" />
      {/* White key separators */}
      <line x1="7.5" y1="12" x2="7.5" y2="18" />
      <line x1="12" y1="12" x2="12" y2="18" />
      <line x1="16.5" y1="12" x2="16.5" y2="18" />
      {/* Black keys */}
      <path d="M5.5 6v6h2V6z" fill="currentColor" />
      <path d="M10 6v6h2V6z" fill="currentColor" />
      <path d="M14.5 6v6h2V6z" fill="currentColor" />
    </svg>
  );
}

// 5. Settings Gear Icon
export function SettingsIcon({ className = "w-5 h-5", strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
