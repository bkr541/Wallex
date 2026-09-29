import { useState } from 'react';
import PageHeader from '../components/PageHeader';

const TABS = ['Profile', 'Appearance', 'Setup'] as const;
type Tab = (typeof TABS)[number];

export default function Settings() {
  const [tab, setTab] = useState<Tab>('Profile');

  return (
    <div className="w-full">
      <PageHeader>Settings</PageHeader>

      <div
        role="tablist"
        aria-label="Settings sections"
        className="mt-6 flex w-full justify-start gap-1 rounded-xl border border-line bg-[#222326] p-1"
      >
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`h-9 cursor-pointer rounded-lg px-4 text-xs font-medium transition ${
              tab === t
                ? 'bg-[#323438] text-ink shadow-[0_3px_7px_rgba(0,0,0,0.17)]'
                : 'text-[#85878b] hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
