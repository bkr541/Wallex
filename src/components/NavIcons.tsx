// Flat, softly shaded nav icons: pale neutral bodies with a single bright accent each.
// They keep their own colors, so the nav dims them when inactive instead of tinting them.

interface IconProps {
  className?: string;
}

const BODY_FROM = '#F7F8FC';
const BODY_TO = '#D5D9E4';
const BLUE = '#2BB3FF';
const ORANGE = '#FFB83D';
const PINK = '#FF5FA8';
const GREEN = '#2ED08A';
const GRAY = '#6B7080';

function Body({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={BODY_FROM} />
        <stop offset="1" stopColor={BODY_TO} />
      </linearGradient>
    </defs>
  );
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <Body id="nav-home" />
      <path
        d="M6 11.2V19.2a1.2 1.2 0 0 0 1.2 1.2H9.6V15.4a1 1 0 0 1 1-1h2.8a1 1 0 0 1 1 1V20.4h2.4a1.2 1.2 0 0 0 1.2-1.2V11.2L12 5.2Z"
        fill="url(#nav-home)"
      />
      <path d="M3.4 11.4 12 4l8.6 7.4" fill="none" stroke={BLUE} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PieIcon({ className }: IconProps) {
  const join = { strokeWidth: 1.2, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M11.00 13.00 L11.00 4.50 A8.5 8.5 0 1 0 15.88 19.96 Z" fill={ORANGE} stroke={ORANGE} {...join} />
      <path d="M11.90 12.10 L11.90 3.60 A8.5 8.5 0 0 1 20.40 12.10 Z" fill={BLUE} stroke={BLUE} {...join} />
      <path d="M11.75 13.35 L20.25 13.35 A8.5 8.5 0 0 1 16.63 20.31 Z" fill={PINK} stroke={PINK} {...join} />
    </svg>
  );
}

export function ReceiptIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <Body id="nav-receipt" />
      <path
        d="M6.8 2.8H14L19 7.8V20.3q-.875 1-1.75 0t-1.75 0t-1.75 0t-1.75 0t-1.75 0t-1.75 0t-1.75 0t-1.75 0V4.6a1.8 1.8 0 0 1 1.8-1.8Z"
        fill="url(#nav-receipt)"
      />
      <path d="M14 2.8 19 7.8H15.4A1.4 1.4 0 0 1 14 6.4Z" fill={BLUE} />
      <rect x="7.5" y="9" width="4.6" height="1.5" rx=".75" fill="#B3B8C6" />
      <rect x="7.5" y="12.2" width="9" height="1.5" rx=".75" fill="#B3B8C6" />
      <rect x="7.5" y="15.4" width="9" height="1.5" rx=".75" fill="#B3B8C6" />
    </svg>
  );
}

export function GearIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <Body id="nav-gear" />
      <path
        d="M10.21 4.82 L10.55 2.31 L13.45 2.31 L13.79 4.82 L15.81 5.66 L17.83 4.12 L19.88 6.17 L18.34 8.19 L19.18 10.21 L21.69 10.55 L21.69 13.45 L19.18 13.79 L18.34 15.81 L19.88 17.83 L17.83 19.88 L15.81 18.34 L13.79 19.18 L13.45 21.69 L10.55 21.69 L10.21 19.18 L8.19 18.34 L6.17 19.88 L4.12 17.83 L5.66 15.81 L4.82 13.79 L2.31 13.45 L2.31 10.55 L4.82 10.21 L5.66 8.19 L4.12 6.17 L6.17 4.12 L8.19 5.66 Z M15 12 a3 3 0 1 0 -6 0 a3 3 0 1 0 6 0 Z"
        fill="url(#nav-gear)"
        stroke="url(#nav-gear)"
        strokeWidth="1.4"
        strokeLinejoin="round"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function ListIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="5.6" cy="6.2" r="2" fill={GREEN} />
      <circle cx="5.6" cy="12" r="2" fill={BLUE} />
      <circle cx="5.6" cy="17.8" r="2" fill={PINK} />
      <rect x="9.6" y="4.8" width="11" height="2.8" rx="1.4" fill={GRAY} />
      <rect x="9.6" y="10.6" width="11" height="2.8" rx="1.4" fill={GRAY} />
      <rect x="9.6" y="16.4" width="11" height="2.8" rx="1.4" fill={GRAY} />
    </svg>
  );
}
