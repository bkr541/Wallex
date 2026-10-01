export default function ChaseLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="#117ACA" stroke="var(--canvas)" strokeWidth="1">
      <polygon points="7,0 17,0 24,7 16,8 8,8" />
      <polygon points="24,7 24,17 17,24 16,16 16,8" />
      <polygon points="17,24 7,24 0,17 8,16 16,16" />
      <polygon points="0,17 0,7 7,0 8,8 8,16" />
    </svg>
  );
}
