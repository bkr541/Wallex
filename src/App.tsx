import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  OverviewIcon,
  ChordsIcon,
  CamelotWheelIcon,
  MidiIcon,
  SettingsIcon,
  VstIcon,
  ProjectsIcon,
  SamplesIcon,
  ComponentsIcon,
} from './components/NavIcons';
import Overview from './pages/Overview';
import Projects from './pages/Projects';
import Samples from './pages/Samples';
import Vst from './pages/Vst';
import Chords from './pages/Chords';
import CamelotWheel from './pages/CamelotWheel';
import Midi from './pages/Midi';
import Settings from './pages/Settings';
import Components from './pages/Components';

interface PageItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  component: React.ComponentType;
}

const PAGES: PageItem[] = [
  { id: 'overview', name: 'Overview', icon: OverviewIcon, component: Overview },
  { id: 'projects', name: 'Projects', icon: ProjectsIcon, component: Projects },
  { id: 'samples', name: 'Samples', icon: SamplesIcon, component: Samples },
  { id: 'vst', name: 'VST', icon: VstIcon, component: Vst },
  { id: 'chords', name: 'Chords', icon: ChordsIcon, component: Chords },
  { id: 'camelot', name: 'Camelot Wheel', icon: CamelotWheelIcon, component: CamelotWheel },
  { id: 'midi', name: 'MIDI', icon: MidiIcon, component: Midi },
  { id: 'settings', name: 'Settings', icon: SettingsIcon, component: Settings },
  { id: 'components', name: 'Components', icon: ComponentsIcon, component: Components },
];

export default function App() {
  const [activePageId, setActivePageId] = useState<string>('overview');
  const [hoveredPageId, setHoveredPageId] = useState<string | null>(null);

  const activePage = PAGES.find((p) => p.id === activePageId) || PAGES[0];
  const ActiveComponent = activePage.component;

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-canvas font-sans text-ink select-none">
      {/* Electron Desktop Window Header Bar */}
      <header
        className="absolute inset-x-0 top-0 z-30 h-10"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      {/* Main Workspace Frame */}
      <div className="relative z-10 flex min-h-0 w-full flex-1">
        {/* Floating Left Vertical Navigation Bar */}
        <nav
          aria-label="Sidebar navigation"
          className="fixed top-1/2 left-6 z-40 flex w-[64px] -translate-y-1/2 flex-col items-center gap-3.5 rounded-[32px] border border-white/[0.06] bg-card/95 p-2 shadow-[0_16px_32px_rgba(0,0,0,0.35),0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-md"
        >
          {PAGES.map((page) => {
            const isActive = activePageId === page.id;
            const isHovered = hoveredPageId === page.id;
            const Icon = page.icon;

            return (
              <div
                key={page.id}
                className="relative flex w-full items-center justify-start"
                onMouseEnter={() => setHoveredPageId(page.id)}
                onMouseLeave={() => setHoveredPageId(null)}
              >
                {/* Active accent indicator on outer left edge */}
                {isActive && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute -left-2 z-30 h-6 w-1.5 rounded-r-full bg-accent"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}

                {/* Nav button with icon and animated expanding page name */}
                <button
                  type="button"
                  onClick={() => setActivePageId(page.id)}
                  aria-label={page.name}
                  aria-current={isActive ? 'page' : undefined}
                  className="relative z-20 flex h-12 cursor-pointer items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  {/* Expanding container on hover */}
                  <motion.div
                    initial={false}
                    animate={{ width: isHovered ? 'auto' : 48 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className={`flex h-12 items-center rounded-full transition-shadow ${
                      isHovered
                        ? 'bg-[#232427] pr-4 shadow-[0_10px_28px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.25)]'
                        : 'bg-transparent'
                    }`}
                  >
                    {/* Icon circle */}
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                        isActive
                          ? 'bg-accent-soft text-accent'
                          : 'text-[#dfe0df] hover:bg-[#202225] hover:text-ink'
                      }`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.8} />
                    </div>

                    {/* Page name slides out to the right on hover */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, x: -10, width: 0 }}
                          animate={{ opacity: 1, x: 0, width: 'auto' }}
                          exit={{ opacity: 0, x: -8, width: 0 }}
                          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden whitespace-nowrap"
                        >
                          <span className="block pr-1 pl-3 text-[13px] font-[540] text-ink">{page.name}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </button>
              </div>
            );
          })}
        </nav>

        {/* Page Content Viewport */}
        <main className="h-full flex-1 overflow-y-auto pt-[26px] pr-12 pb-12 pl-32">
          <ActiveComponent />
        </main>
      </div>
    </div>
  );
}
