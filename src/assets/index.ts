// Drop image files into src/assets (any subfolder) and refer to them by their path inside it:
//
//   import { asset } from '../assets';
//   <img src={asset('logos/chase.png')} />
//
// Supported: png, jpg, jpeg, svg, webp, gif, ico. Vite bundles them, so this also works in the
// built desktop app. Returns undefined if the file is missing.
const files = import.meta.glob('./**/*.{png,jpg,jpeg,svg,webp,gif,ico}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export const asset = (path: string): string | undefined => files[`./${path.replace(/^\.?\//, '')}`];

export const assetPaths = (): string[] => Object.keys(files).map((p) => p.slice(2));
