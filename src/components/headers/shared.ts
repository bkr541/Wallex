import type { NavItem } from '../../lib/pages';

export interface HeaderProps {
  page: NavItem;
  index: number; // 1-based position of the page in the sidebar
  total: number;
}

export const pad = (n: number) => String(n).padStart(2, '0');

// The app's own teal, used alongside each page's colour so every header still feels like Wallex.
export const BRAND = '79, 184, 165';
