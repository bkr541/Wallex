import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Database, Folder, Settings, User } from 'lucide-react';

interface NavItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: boolean;
}

const NAV: NavItem[] = [
  { id: 'profile', name: 'Profile', icon: User },
  { id: 'library', name: 'Sample Library', icon: Database },
  { id: 'files', name: 'Files', icon: Folder },
  { id: 'notifications', name: 'Notifications', icon: Bell, badge: true },
  { id: 'settings', name: 'Settings', icon: Settings },
];

export default function App() {
  const [activeId, setActiveId] = useState('library');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-canvas font-sans text-ink select-none">
      <header
        className="absolute inset-x-0 top-0 z-30 h-10"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      {/* Decorative background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-56 left-12 h-[480px] w-[480px] rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -right-40 -bottom-56 h-[700px] w-[700px] rounded-full bg-sky-200/50 blur-3xl" />
        <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-orange-100/60 blur-3xl" />
        <div className="absolute top-[138px] left-[280px] h-8 w-8 rounded-full bg-sky-200" />
        <div className="absolute top-[200px] left-[352px] h-[18px] w-[18px] rounded-full bg-violet-200/70" />
        <div className="absolute top-[444px] right-[70px] h-6 w-6 rounded-full bg-orange-200/80" />
      </div>

      <nav
        aria-label="Sidebar navigation"
        className="fixed top-[136px] left-6 z-40 flex h-[662px] w-[100px] flex-col items-center gap-[18px] rounded-[50px] bg-card/90 pt-[21px] shadow-[0_16px_40px_rgba(45,212,167,0.15)] backdrop-blur-md"
      >
        {NAV.map((item) => {
          const isActive = activeId === item.id;
          const isHovered = hoveredId === item.id;
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              className="relative flex h-[70px] w-[70px] items-center"
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {isActive && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute -left-[19px] h-16 w-2 rounded-full bg-accent"
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
                    className="absolute left-[30px] z-10 flex h-[62px] items-center rounded-full bg-card pr-7 pl-[46px] whitespace-nowrap shadow-[0_8px_24px_rgba(45,212,167,0.15)]"
                  >
                    <span className="text-[19px] font-medium">{item.name}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="button"
                onClick={() => setActiveId(item.id)}
                aria-label={item.name}
                aria-current={isActive ? 'page' : undefined}
                className={`relative z-20 flex h-[70px] w-[70px] cursor-pointer items-center justify-center rounded-full transition-colors ${
                  isActive ? 'bg-accent-soft text-accent' : 'bg-surface text-ink hover:bg-gray-200'
                }`}
              >
                <Icon className="h-7 w-7" strokeWidth={1.6} />
                {item.badge && (
                  <span className="absolute top-[11px] right-[12px] h-3 w-3 rounded-full bg-badge" />
                )}
              </button>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
