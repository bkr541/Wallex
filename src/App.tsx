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
  ComponentsIcon,
} from './components/NavIcons';
import Overview from './pages/Overview';
import Projects from './pages/Projects';
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
    <div className="relative w-screen h-screen overflow-hidden bg-[#eaf7f4] flex flex-col font-sans select-none text-slate-800">
      {/* Background Stylized Gradient Mesh & Pastel Accents from reference image */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Ambient background gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#ebf8f5] via-[#e6f6f2] to-[#f3faf7]" />

        {/* Soft top-left pastel mint glow */}
        <div className="absolute -top-28 -left-28 w-[580px] h-[580px] rounded-full bg-gradient-to-br from-[#c8f6ec]/65 to-[#d8f9f2]/30 blur-3xl" />

        {/* Soft bottom-right pastel mint/seafoam circular bloom */}
        <div className="absolute -bottom-36 -right-36 w-[680px] h-[680px] rounded-full bg-gradient-to-tl from-[#caf8ef]/65 to-[#defbf5]/30 blur-3xl" />

        {/* Warm subtle peach glow in upper-right */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[380px] rounded-full bg-gradient-to-b from-[#fff6ed]/70 to-transparent blur-3xl" />

        {/* Decorative Floating Dots matching the reference screenshot */}
        {/* Turquoise dot near top left */}
        <div className="absolute top-[14.5%] left-[17.5%] w-4 h-4 rounded-full bg-[#6de0ee]/85 shadow-[0_2px_12px_rgba(109,224,238,0.45)]" />

        {/* Pastel lavender dot */}
        <div className="absolute top-[21.8%] left-[21.8%] w-2.5 h-2.5 rounded-full bg-[#ccbefe]/85 shadow-[0_2px_8px_rgba(204,190,254,0.45)]" />

        {/* Peach dot near middle-right */}
        <div className="absolute top-[47.5%] right-[5.5%] w-3.5 h-3.5 rounded-full bg-[#fecba4]/95 shadow-[0_2px_10px_rgba(254,203,164,0.45)]" />
      </div>

      {/* Electron Desktop Window Header Bar */}
      <header
        className="absolute top-0 inset-x-0 z-30 h-10"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      {/* Main Workspace Frame */}
      <div className="relative z-10 flex-1 w-full min-h-0 flex">
        {/* Floating Left Vertical Navigation Bar */}
        <nav
          aria-label="Sidebar navigation"
          className="fixed left-6 top-1/2 -translate-y-1/2 z-40 w-[64px] bg-white/95 backdrop-blur-md rounded-[32px] p-2 shadow-[0_16px_40px_rgba(16,160,140,0.08),0_2px_12px_rgba(0,0,0,0.04)] border border-white/80 flex flex-col items-center gap-3.5"
        >
          {PAGES.map((page) => {
            const isActive = activePageId === page.id;
            const isHovered = hoveredPageId === page.id;
            const Icon = page.icon;

            return (
              <div
                key={page.id}
                className="relative flex items-center w-full justify-start"
                onMouseEnter={() => setHoveredPageId(page.id)}
                onMouseLeave={() => setHoveredPageId(null)}
              >
                {/* Active Teal Accent Indicator on outer left edge */}
                {isActive && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute -left-2 w-1.5 h-6 rounded-r-full bg-[#00c9a7] z-30"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}

                {/* Nav Button with Icon and Animated Expanding Page Name */}
                <button
                  type="button"
                  onClick={() => setActivePageId(page.id)}
                  aria-label={page.name}
                  className="relative z-20 flex items-center h-12 rounded-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#00c9a7]/50"
                >
                  {/* Expanding Container on Hover */}
                  <motion.div
                    initial={false}
                    animate={{
                      width: isHovered ? 'auto' : 48,
                    }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className={`h-12 flex items-center rounded-full transition-shadow ${
                      isHovered
                        ? 'bg-white shadow-[0_10px_28px_rgba(0,180,160,0.1),0_2px_8px_rgba(0,0,0,0.04)] pr-4'
                        : 'bg-transparent'
                    }`}
                  >
                    {/* Icon Circle */}
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 ${
                        isActive
                          ? 'bg-[#dcf6f0] text-[#00bda0]'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/60'
                      }`}
                    >
                      <Icon className="w-5 h-5" strokeWidth={1.8} />
                    </div>

                    {/* Animate Page Name to the Right on Hover */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, x: -10, width: 0 }}
                          animate={{ opacity: 1, x: 0, width: 'auto' }}
                          exit={{ opacity: 0, x: -8, width: 0 }}
                          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden whitespace-nowrap"
                        >
                          <span className="pl-3 pr-1 text-sm font-semibold text-slate-800 tracking-tight block">
                            {page.name}
                          </span>
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
        <main className="flex-1 h-full overflow-y-auto pl-32 pr-12 pt-[26px]">
          <ActiveComponent />
        </main>
      </div>
    </div>
  );
}
