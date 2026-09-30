import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeftRight, LayoutDashboard, Repeat, Settings } from 'lucide-react';

interface NavItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  description: string;
  tabs?: string[];
}

const TABS = ['Tab One', 'Tab Two'];

const NAV: NavItem[] = [
  { id: 'overview', name: 'Overview', icon: LayoutDashboard, description: 'Your spending at a glance, all in one place.' },
  { id: 'habits', name: 'Habits', icon: Repeat, description: 'Track the spending routines that shape your month.' },
  { id: 'transactions', name: 'Transactions', icon: ArrowLeftRight, description: 'Review every purchase, payment and deposit.' },
  { id: 'settings', name: 'Settings', icon: Settings, description: 'Manage your account and app preferences.', tabs: ['Profile', 'Appearance', 'Setup'] },
];

export default function App() {
  const [activeId, setActiveId] = useState('overview');
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({});
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const activePage = NAV.find((item) => item.id === activeId)!;
  const tabs = activePage.tabs ?? TABS;
  const activeTab = activeTabs[activeId] ?? tabs[0];

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-canvas font-sans text-ink select-none">
      <header
        className="absolute inset-x-0 top-0 z-30 h-10"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      <nav
        aria-label="Sidebar navigation"
        className="fixed top-1/2 left-5 z-40 flex w-[68px] -translate-y-1/2 flex-col items-center gap-2.5 rounded-[34px] border border-line bg-card p-[10px] shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
      >
        {NAV.map((item) => {
          const isActive = activeId === item.id;
          const isHovered = hoveredId === item.id;
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              className="relative flex h-12 w-12 items-center"
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {isActive && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute -left-[14px] h-7 w-1.5 rounded-full bg-accent"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}

              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.18 }}
                    className="absolute left-6 z-10 flex h-11 items-center rounded-full border border-line bg-surface pr-5 pl-[34px] whitespace-nowrap shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
                  >
                    <span className="text-sm font-medium">{item.name}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="button"
                onClick={() => setActiveId(item.id)}
                aria-label={item.name}
                aria-current={isActive ? 'page' : undefined}
                className={`relative z-20 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full transition-colors ${
                  isActive
                    ? 'border border-line bg-surface text-ink'
                    : 'text-muted hover:bg-surface/60 hover:text-ink'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.6} />
              </button>
            </div>
          );
        })}
      </nav>

      <main className="absolute inset-y-0 right-8 left-32 z-20 flex flex-col pt-6 pb-8">
        <h1 className="self-end text-6xl font-semibold tracking-tight">{activePage.name}</h1>
        <p className="mt-2 self-end font-support text-base text-muted">{activePage.description}</p>

        <div role="tablist" className="mt-12 flex w-full items-center justify-start gap-3 border-b border-line">
          {tabs.map((tab) => {
            const selected = tab === activeTab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTabs((prev) => ({ ...prev, [activeId]: tab }))}
                className={`-mb-px cursor-pointer border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  selected
                    ? 'border-accent text-ink'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" className="mt-6 min-h-0 flex-1">
          <div className="p-6">
            <p className="font-support text-sm text-muted">
              {activePage.name} · {activeTab}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
