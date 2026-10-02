import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import AuroraHeader from '../components/headers/AuroraHeader';
import CompactHeader from '../components/headers/CompactHeader';
import EditorialHeader from '../components/headers/EditorialHeader';
import FolderHeader from '../components/headers/FolderHeader';
import FanDeckHeader from '../components/headers/FanDeckHeader';
import MonogramHeader from '../components/headers/MonogramHeader';
import NeonRailHeader from '../components/headers/NeonRailHeader';
import OrbitHeader from '../components/headers/OrbitHeader';
import SheetsOrbitHeader from '../components/headers/SheetsOrbitHeader';
import SplitBlockHeader from '../components/headers/SplitBlockHeader';
import type { HeaderProps } from '../components/headers/shared';
import { NAV } from '../lib/pages';

const STYLES: { id: string; name: string; note: string; Component: (props: HeaderProps) => React.ReactElement }[] = [
  {
    id: 'aurora',
    name: 'Aurora glass',
    note: 'Soft colour fields, film grain and a frosted icon tile. The showpiece, for landing pages like Overview.',
    Component: AuroraHeader,
  },
  {
    id: 'editorial',
    name: 'Editorial index',
    note: 'Brand eyebrow, hairline rule and a ghosted page icon. Pure typography, calm on busy pages.',
    Component: EditorialHeader,
  },
  {
    id: 'orbit',
    name: 'Orbit spotlight',
    note: 'The page icon in a glowing disc with slow rings and moons. Echoes the Patterns circles.',
    Component: OrbitHeader,
  },
  {
    id: 'folder',
    name: 'Dossier folder',
    note: 'An icon tab, pinstriped body, sheets peeking out below and a rubber-stamp seal. Paperwork feel for the ledger pages.',
    Component: FolderHeader,
  },
  {
    id: 'compact',
    name: 'Compact status bar',
    note: 'One slim row with a live sync status and a light sweep. For table and form pages where space matters.',
    Component: CompactHeader,
  },
  {
    id: 'neon',
    name: 'Neon rail',
    note: 'No panel: a glowing rail, a title ending in a neon outline, a live pill and a light sweep.',
    Component: NeonRailHeader,
  },
  {
    id: 'monogram',
    name: 'Monogram',
    note: 'The page icon over a big soft gradient disc, an accent dash above the title and aurora light behind.',
    Component: MonogramHeader,
  },
  {
    id: 'fan',
    name: 'Fan deck',
    note: 'Flat cards fanned from the corner and a solid colour subtitle chip.',
    Component: FanDeckHeader,
  },
  {
    id: 'sheets',
    name: 'Sheets and orbit',
    note: 'The title sits right-aligned on a stack of tilted sheets, with the page icon circling in an orbit on the left.',
    Component: SheetsOrbitHeader,
  },
  {
    id: 'split',
    name: 'Split block',
    note: 'A solid colour block with a ghosted icon beside a dark panel with a neon title and a light sweep.',
    Component: SplitBlockHeader,
  },
];

// Five header styles to choose between. Each one takes a page's name, description, icon and colour,
// so pick a page below to see every style dressed for it.
export default function HeadersTab() {
  const [pageId, setPageId] = useState(NAV[0].id);
  const page = NAV.find((p) => p.id === pageId) ?? NAV[0];
  const index = NAV.indexOf(page) + 1;

  return (
    <div className="space-y-10 px-1 pb-10">
      <div className="space-y-4 px-3">
        <div>
          <h2 className="text-lg font-semibold">Header styles</h2>
          <p className="mt-1 font-support text-sm text-muted">
            Ten directions for the heading row at the top of every page. Switch page to see each one with that page’s
            icon, colour and wording.
          </p>
        </div>
        <div role="tablist" aria-label="Preview page" className="flex flex-wrap gap-2">
          {NAV.map((p) => {
            const Icon = p.icon;
            const selected = p.id === pageId;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setPageId(p.id)}
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors ${
                  selected ? 'border-accent bg-accent-soft text-ink' : 'border-line bg-card text-muted hover:text-ink'
                }`}
              >
                <Icon className="h-5 w-5" />
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      {STYLES.map((style, i) => (
        <section key={style.id}>
          {i === 5 && (
            <div className="mb-8 border-t border-line px-3 pt-8">
              <h2 className="text-lg font-semibold">Round two: mixed</h2>
              <p className="mt-1 font-support text-sm text-muted">
                The first five blended with the new references: the vertical rail and neon outline, the icon over
                a gradient disc, flat fanned cards, stacked sheets and solid colour chips.
              </p>
            </div>
          )}
          <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3">
            <span className="font-support text-xs tracking-widest text-muted">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="text-base font-semibold">{style.name}</h3>
            <p className="font-support text-sm text-muted">{style.note}</p>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${style.id}-${page.id}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <style.Component page={page} index={index} total={NAV.length} />
            </motion.div>
          </AnimatePresence>
        </section>
      ))}
    </div>
  );
}
