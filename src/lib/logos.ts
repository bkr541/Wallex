import { asset } from '../assets';

const EXTENSIONS = ['png', 'svg', 'webp', 'jpg', 'jpeg'];

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// Your own logo wins over anything downloaded. Drop a file named after the merchant into
// src/assets/logos/merchants/, for example spotify.png or georgia-power.svg.
export function localLogo(name: string): string | undefined {
  const base = slug(name);
  if (!base) return undefined;
  for (const ext of EXTENSIONS) {
    const found = asset(`logos/merchants/${base}.${ext}`);
    if (found) return found;
  }
  return undefined;
}
