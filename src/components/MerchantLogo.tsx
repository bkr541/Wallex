import { useState } from 'react';

// A stable hue per merchant so the initials fallback keeps its color between loads.
const hueFor = (name: string) => {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return hash;
};

const initialsFor = (name: string) => {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, '').trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2)).toUpperCase();
};

// Tries each logo source in order, moving on when one fails to load, and ends on initials.
export default function MerchantLogo({ name, sources }: { name: string; sources: string[] }) {
  const [failed, setFailed] = useState(0);
  const src = sources[failed];

  return (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line text-[10px] font-semibold text-ink"
      style={src ? { background: 'var(--surface)' } : { background: `hsl(${hueFor(name)} 40% 28%)` }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          draggable={false}
          referrerPolicy="no-referrer"
          onError={() => setFailed((n) => n + 1)}
          className="h-full w-full object-cover"
        />
      ) : (
        initialsFor(name)
      )}
    </span>
  );
}
