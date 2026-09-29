import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
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
  const [collapsed, setCollapsed] = useState(false);

  const activePage = PAGES.find((p) => p.id === activePageId) || PAGES[0];
  const ActiveComponent = activePage.component;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-canvas font-sans text-ink select-none">
      {/* Electron window drag region */}
      <header
        className="absolute inset-x-0 top-0 z-30 h-10"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      {/* Left navigation */}
      <aside
        aria-label="Sidebar navigation"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className={`fixed inset-y-0 left-0 z-40 flex flex-col overflow-x-hidden overflow-y-auto border-r border-white/[0.055] bg-nav px-3 py-4 transition-[width] duration-200 ease-[var(--ease)] ${
          collapsed ? 'w-16' : 'w-[220px]'
        }`}
      >
        <button
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((v) => !v)}
          className={`mb-[18px] grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl bg-[#1c1d20] transition-colors hover:bg-[#24262a] ${
            collapsed ? 'mx-auto' : 'ml-auto'
          }`}
        >
          <ChevronLeft
            className={`h-4 w-4 text-[#ececeb] transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
            strokeWidth={2}
          />
        </button>

        <nav className="grid gap-1">
          {PAGES.map((page) => {
            const isActive = activePageId === page.id;
            const Icon = page.icon;

            return (
              <button
                key={page.id}
                type="button"
                onClick={() => setActivePageId(page.id)}
                aria-label={page.name}
                aria-current={isActive ? 'page' : undefined}
                title={collapsed ? page.name : undefined}
                className={`flex h-[46px] w-full shrink-0 cursor-pointer items-center gap-[11px] overflow-hidden rounded-xl text-left transition-colors ${
                  collapsed ? 'justify-center px-0' : 'px-[13px]'
                } ${isActive ? 'bg-[#202225] text-[#f0f1f0]' : 'text-[#e9e9e8] hover:bg-[#202225]'}`}
              >
                <Icon className="h-[19px] w-[19px] shrink-0 text-[#dfe0df]" strokeWidth={1.8} />
                <span
                  className={`overflow-hidden text-[13px] font-[540] whitespace-nowrap text-ellipsis transition-[opacity,width] duration-150 ${
                    collapsed ? 'w-0 opacity-0' : 'flex-1'
                  }`}
                >
                  {page.name}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Page content */}
      <main
        className={`h-full overflow-y-auto bg-canvas px-[30px] pt-[26px] pb-12 transition-[margin-left] duration-200 ease-[var(--ease)] ${
          collapsed ? 'ml-16' : 'ml-[220px]'
        }`}
      >
        <div className="mx-auto w-full max-w-[1180px]">
          <ActiveComponent />
        </div>
      </main>
    </div>
  );
}
