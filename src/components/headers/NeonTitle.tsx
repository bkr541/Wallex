// A title whose last part is drawn as a glowing outline, like a neon sign.
// The outline is built from offset shadows around a background-coloured fill. A text stroke would
// also trace the overlapping contours inside this font's glyphs and look scribbled.
export default function NeonTitle({ text, rgb, className = '' }: { text: string; rgb: string; className?: string }) {
  const cut = Math.max(1, Math.ceil(text.length * 0.55));
  const c = `rgb(${rgb})`;
  return (
    <h2 className={`font-semibold tracking-tight ${className}`}>
      <span>{text.slice(0, cut)}</span>
      <span
        style={{
          color: '#0a0c0e',
          filter: `drop-shadow(1.5px 0 0 ${c}) drop-shadow(-1.5px 0 0 ${c}) drop-shadow(0 1.5px 0 ${c}) drop-shadow(0 -1.5px 0 ${c}) drop-shadow(0 0 16px rgba(${rgb}, 0.55))`,
        }}
      >
        {text.slice(cut)}
      </span>
    </h2>
  );
}
