import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import UnderlineTabs from '../components/UnderlineTabs';
import SetupTab from './settings/SetupTab';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'setup', label: 'Setup' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export default function Settings() {
  const [tab, setTab] = useState<Tab>('profile');

  return (
    <div className="w-full">
      <PageHeader>Settings</PageHeader>
      <UnderlineTabs className="mt-6" label="Settings sections" tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'setup' && <SetupTab />}
    </div>
  );
}
