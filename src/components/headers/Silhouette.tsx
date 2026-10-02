import { useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { NavItem } from '../../lib/pages';

// A page icon drawn as a single flat shape that can be filled with any gradient. The icon's own colours are
// thrown away and only its outline is kept, as a mask over whatever `background` is given.
export default function Silhouette({
  icon: Icon,
  className = '',
  style,
}: {
  icon: NavItem['icon'];
  className?: string;
  style?: React.CSSProperties;
}) {
  const mask = useMemo(() => {
    const svg = renderToStaticMarkup(<Icon />).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }, [Icon]);
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        WebkitMaskImage: mask,
        maskImage: mask,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        ...style,
      }}
    />
  );
}
