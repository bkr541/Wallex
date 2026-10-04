import Silhouette from './headers/Silhouette';
import type { NavItem } from '../lib/pages';
import { displayName, useProfile } from '../lib/profile';

// The heading at the top of every page, in the "Giant crop" style: the page's own icon blown up until the
// frame cuts it off, on a soft disc, with a wash of the accent colour behind the title. Everything is
// drawn from the theme variables, so it follows the theme and accent chosen in Settings → Appearance.
export default function PageHeader({ page, compact = false }: { page: NavItem; compact?: boolean }) {
  const name = displayName(useProfile());
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  // Overview greets you by name once you have told Wallex what to call you.
  const description = page.id === 'overview' && name ? `${greeting}, ${name}. ${page.description}` : page.description;
  return (
    <header
      className={`relative shrink-0 overflow-hidden border ${compact ? 'min-h-[132px] rounded-[24px]' : 'min-h-[184px] rounded-[28px]'}`}
      style={{
        borderColor: 'color-mix(in srgb, var(--accent) 38%, transparent)',
        background:
          'linear-gradient(90deg, var(--canvas) 0%, color-mix(in srgb, var(--accent) 8%, var(--card)) 55%, color-mix(in srgb, var(--accent) 20%, var(--card)) 100%)',
      }}
    >
      <span
        aria-hidden="true"
        className="absolute top-[-35%] right-[2%] aspect-square h-[190%] rounded-full"
        style={{ background: 'radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--accent) 36%, transparent), color-mix(in srgb, var(--accent) 8%, transparent) 65%, transparent 72%)' }}
      />
      <Silhouette
        icon={page.icon}
        className={`absolute aspect-square ${compact ? 'top-[-16%] right-[-10%] h-[150%] opacity-50' : 'top-[-14%] right-[-3%] h-[150%]'}`}
        style={{
          background:
            'linear-gradient(150deg, color-mix(in srgb, var(--accent) 78%, white) 0%, var(--accent) 38%, color-mix(in srgb, var(--accent) 50%, black) 100%)',
          filter: 'drop-shadow(0 0 30px color-mix(in srgb, var(--accent) 30%, transparent))',
        }}
      />
      <div className={`relative flex flex-col justify-center ${compact ? 'min-h-[132px] px-5 py-4' : 'min-h-[184px] px-8 py-5'}`}>
        <h1 className={`leading-none font-semibold tracking-tight ${compact ? 'text-3xl' : 'text-5xl'}`}>{page.name}</h1>
        <p className={`mt-2.5 font-support text-ink/70 ${compact ? 'max-w-[11.5rem] text-sm' : 'max-w-md text-base'}`}>{description}</p>
      </div>
    </header>
  );
}
