import { useState } from 'react';

const TABS = ['Profile', 'Appearance', 'Setup'] as const;
type Tab = (typeof TABS)[number];

export default function Settings() {
  const [tab, setTab] = useState<Tab>('Profile');

  return (
    <div className="w-full">
      <h1 className="text-3xl font-semibold text-slate-800 tracking-tight">Settings</h1>

      <div
        role="tablist"
        aria-label="Settings sections"
        className="mt-6 flex w-full justify-start p-1 rounded-full bg-white/95 border border-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
      >
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`h-9 px-5 rounded-full text-sm font-semibold transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#00c9a7]/50 ${
              tab === t ? 'bg-[#dcf6f0] text-[#00bda0]' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
