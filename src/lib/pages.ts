import type React from 'react';
import { GearIcon, HomeIcon, ListIcon, PatternsIcon, ReceiptIcon } from '../components/NavIcons';

export interface NavItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  tabs?: string[];
  accent: string; // "r, g, b" colour of the page, taken from its icon
}

export const TABS = ['Tab One', 'Tab Two'];

export const NAV: NavItem[] = [
  { id: 'overview', name: 'Overview', icon: HomeIcon, accent: '43, 179, 255', description: 'Your spending at a glance, all in one place.', tabs: [] },
  { id: 'patterns', name: 'Patterns', icon: PatternsIcon, accent: '255, 184, 61', description: 'Track the spending routines that shape your month.', tabs: [] },
  { id: 'transactions', name: 'Transactions', icon: ReceiptIcon, accent: '129, 140, 248', description: 'Review every purchase, payment and deposit.', tabs: ['Checking', 'Recurring'] },
  { id: 'settings', name: 'Settings', icon: GearIcon, accent: '148, 163, 184', description: 'Manage your account and app preferences.', tabs: ['Profile', 'Appearance', 'Setup'] },
  { id: 'scratchpad', name: 'Scratchpad', icon: ListIcon, accent: '46, 208, 138', description: 'A sandbox for trying out interface components.', tabs: ['UI Components', 'Headers', 'Loading'] },
];
