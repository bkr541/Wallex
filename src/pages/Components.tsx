import { memo, useEffect, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import './components-guide/library.css';
import { wireLibrary } from './components-guide/wireLibrary';
import Foundations from './components-guide/sections/Foundations';
import Cards from './components-guide/sections/Cards';
import Navigation from './components-guide/sections/Navigation';
import Actions from './components-guide/sections/Actions';
import Forms from './components-guide/sections/Forms';
import Containers from './components-guide/sections/Containers';
import DataDisplay from './components-guide/sections/DataDisplay';
import Feedback from './components-guide/sections/Feedback';
import Overlays from './components-guide/sections/Overlays';
import Selection from './components-guide/sections/Selection';
import Media from './components-guide/sections/Media';
import Productivity from './components-guide/sections/Productivity';
import Identity from './components-guide/sections/Identity';
import Discovery from './components-guide/sections/Discovery';
import SettingsComponents from './components-guide/sections/SettingsComponents';
import LayoutComponents from './components-guide/sections/LayoutComponents';

// Temporary visual style guide, ported from the UI component library reference.
// Purely presentational: no backend/IPC. To remove it, delete this file, ./components-guide,
// and the nav entry in App.tsx.

const CATEGORIES = [
  { id: 'foundations', label: 'Foundations' },
  { id: 'cards', label: 'UI Cards' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'actions', label: 'Buttons & Actions' },
  { id: 'forms', label: 'Form Controls' },
  { id: 'containers', label: 'Content Containers' },
  { id: 'data-display', label: 'Data Display' },
  { id: 'feedback', label: 'Status & Feedback' },
  { id: 'overlays', label: 'Overlays' },
  { id: 'selection', label: 'Selection & Organization' },
  { id: 'media', label: 'Media Components' },
  { id: 'productivity', label: 'Application / Productivity' },
  { id: 'identity', label: 'Information & Identity' },
  { id: 'discovery', label: 'Search & Discovery' },
  { id: 'settings-components', label: 'Settings Components' },
  { id: 'layout-components', label: 'Layout Components' },
];

// The demo markup is wired up imperatively by wireLibrary(), so it must never re-render.
const Panels = memo(function Panels() {
  return (
    <>
      <Foundations />
      <Cards />
      <Navigation />
      <Actions />
      <Forms />
      <Containers />
      <DataDisplay />
      <Feedback />
      <Overlays />
      <Selection />
      <Media />
      <Productivity />
      <Identity />
      <Discovery />
      <SettingsComponents />
      <LayoutComponents />
    </>
  );
});

export default function Components() {
  const [active, setActive] = useState('foundations');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => wireLibrary(rootRef.current!), []);

  return (
    <div ref={rootRef} className="lib w-full select-text pb-6" data-active={active}>
      <PageHeader>Components</PageHeader>

      <div
        role="tablist"
        aria-label="Component categories"
        className="mb-7 mt-6 flex w-full flex-wrap justify-start gap-0.5 rounded-xl border border-line bg-[#222326] p-1"
      >
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            role="tab"
            type="button"
            aria-selected={active === c.id}
            onClick={() => setActive(c.id)}
            className={`h-8 cursor-pointer rounded-lg px-2.5 text-[11px] font-medium transition ${
              active === c.id
                ? 'bg-[#323438] text-ink shadow-[0_3px_7px_rgba(0,0,0,0.17)]'
                : 'text-[#85878b] hover:text-ink'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <Panels />
    </div>
  );
}
