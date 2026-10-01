import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import SetupTab from './pages/SetupTab';
import CheckingTab from './pages/CheckingTab';
import PatternsTab from './pages/PatternsTab';
import RecurringTab from './pages/RecurringTab';
import UiComponentsTab from './pages/UiComponentsTab';
import ChaseLogo from './components/ChaseLogo';
import { accountLabel, useTransactions } from './lib/useTransactions';
import { GearIcon, HomeIcon, ListIcon, PieIcon, ReceiptIcon } from './components/NavIcons';
import { Monitor, Smartphone } from 'lucide-react';
import { ViewModeProvider } from './lib/viewMode';

interface NavItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  tabs?: string[];
}

const TABS = ['Tab One', 'Tab Two'];

const NAV: NavItem[] = [
  { id: 'overview', name: 'Overview', icon: HomeIcon, description: 'Your spending at a glance, all in one place.' },
  { id: 'patterns', name: 'Patterns', icon: PieIcon, description: 'Track the spending routines that shape your month.', tabs: [] },
  { id: 'transactions', name: 'Transactions', icon: ReceiptIcon, description: 'Review every purchase, payment and deposit.', tabs: ['Checking', 'Recurring'] },
  { id: 'settings', name: 'Settings', icon: GearIcon, description: 'Manage your account and app preferences.', tabs: ['Profile', 'Appearance', 'Setup'] },
  { id: 'scratchpad', name: 'Scratchpad', icon: ListIcon, description: 'A sandbox for trying out interface components.', tabs: ['UI Components'] },
];

export default function App() {
  const [activeId, setActiveId] = useState('overview');
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({});
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { load, refreshing, refresh } = useTransactions();

  // Desktop layout, or a phone-sized frame. Remembered between launches.
  const [frameEl, setFrameEl] = useState<HTMLDivElement | null>(null);
  const [mobile, setMobile] = useState(() => {
    try {
      return localStorage.getItem('wallex-view') === 'mobile';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('wallex-view', mobile ? 'mobile' : 'desktop');
    } catch {
      // Not remembering the choice is fine.
    }
  }, [mobile]);

  const activePage = NAV.find((item) => item.id === activeId)!;
  const tabs = activePage.tabs ?? TABS;
  const activeTab = activeTabs[activeId] ?? tabs[0];

  // Pages size themselves from --app-w / --app-h instead of the window, so they fit the phone frame too.
  const sizeVars = (
    mobile
      ? { '--app-w': '390px', '--app-h': 'min(844px, calc(100vh - 3rem))' }
      : { '--app-w': '100vw', '--app-h': '100vh' }
  ) as React.CSSProperties;

  return (
    <ViewModeProvider value={{ mobile, frame: frameEl }}>
    <div
      className={`h-screen w-screen bg-canvas ${mobile ? 'flex items-center justify-center bg-[#050506]' : ''}`}
      style={sizeVars}
    >
      <div
        className="absolute inset-x-0 top-0 z-0 h-10"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />
    <div
      ref={setFrameEl}
      className={`relative overflow-hidden bg-canvas font-sans text-ink select-none ${
        mobile
          ? 'w-[390px] rounded-[44px] border border-line shadow-[0_30px_90px_rgba(0,0,0,0.7)]'
          : 'h-screen w-screen'
      }`}
      style={mobile ? { height: 'var(--app-h)' } : undefined}
    >
      <header
        className="absolute inset-x-0 top-0 z-30 h-10"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      <nav
        aria-label="Sidebar navigation"
        className={`absolute z-40 flex items-center border border-line bg-card shadow-[0_16px_40px_rgba(0,0,0,0.6)] ${
          mobile
            ? 'inset-x-3 bottom-3 justify-around rounded-[32px] p-2'
            : 'top-1/2 left-5 w-[68px] -translate-y-1/2 flex-col gap-2.5 rounded-[34px] p-[10px]'
        }`}
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
                  className={`absolute rounded-full bg-accent ${mobile ? '-top-[9px] h-1.5 w-7' : '-left-[14px] h-7 w-1.5'}`}
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}

              <AnimatePresence>
                {isHovered && !mobile && (
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
                className={`group relative z-20 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full transition-colors ${
                  isActive
                    ? 'border border-line bg-surface text-ink'
                    : 'text-muted hover:bg-surface/60 hover:text-ink'
                }`}
              >
                <Icon
                  className={`h-8 w-8 transition-opacity ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}
                />
              </button>
            </div>
          );
        })}
      </nav>

      <main
        className={`absolute z-20 flex flex-col ${
          mobile ? 'inset-x-4 top-0 bottom-24 pt-10' : 'inset-y-0 right-8 left-32 pt-6 pb-8'
        }`}
      >
        <h1 className={`font-semibold tracking-tight ${mobile ? 'self-start text-4xl' : 'self-end text-6xl'}`}>
          {activePage.name}
        </h1>
        <p className={`mt-2 font-support text-muted ${mobile ? 'self-start text-sm' : 'self-end text-base'}`}>
          {activePage.description}
        </p>

        {tabs.length > 0 && (
        <div
          role="tablist"
          className={`flex w-full items-center justify-start gap-3 border-b border-line ${
            mobile ? 'mt-5 overflow-x-auto' : 'mt-12'
          }`}
        >
          {tabs.map((tab) => {
            const selected = tab === activeTab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTabs((prev) => ({ ...prev, [activeId]: tab }))}
                className={`-mb-px shrink-0 cursor-pointer border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  selected
                    ? 'border-accent text-ink'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                <span className="flex items-center gap-2">
                  {tab === 'Checking' && <ChaseLogo className="h-4 w-4" />}
                  {tab === 'Checking' ? accountLabel(load) : tab}
                </span>
              </button>
            );
          })}
        </div>
        )}

        <div
          role="tabpanel"
          className={`@container ${tabs.length > 0 ? (mobile ? 'mt-4' : 'mt-6') : mobile ? 'mt-5' : 'mt-12'} min-h-0 flex-1 overflow-y-auto`}
        >
          {activeId === 'patterns' ? (
            <PatternsTab load={load} />
          ) : activeId === 'settings' && activeTab === 'Setup' ? (
            <SetupTab onConnectionChange={refresh} />
          ) : activeId === 'transactions' && activeTab === 'Checking' ? (
            <CheckingTab load={load} refreshing={refreshing} onRefresh={refresh} />
          ) : activeId === 'scratchpad' && activeTab === 'UI Components' ? (
            <UiComponentsTab />
          ) : activeId === 'transactions' && activeTab === 'Recurring' ? (
            <RecurringTab load={load} />
          ) : (
            <div className="p-6">
              <p className="font-support text-sm text-muted">
                {activePage.name} · {activeTab}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>

      <button
        type="button"
        onClick={() => setMobile((m) => !m)}
        aria-label={mobile ? 'Switch to desktop view' : 'Switch to mobile view'}
        title={mobile ? 'Switch to desktop view' : 'Switch to mobile view'}
        className="fixed right-5 bottom-5 z-50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-line bg-card text-muted shadow-[0_10px_28px_rgba(0,0,0,0.6)] transition-colors hover:bg-surface hover:text-ink"
      >
        {mobile ? <Monitor className="h-[18px] w-[18px]" /> : <Smartphone className="h-[18px] w-[18px]" />}
      </button>
    </div>
    </ViewModeProvider>
  );
}
