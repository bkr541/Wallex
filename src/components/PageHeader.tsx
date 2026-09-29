import type { ReactNode } from 'react';

export default function PageHeader({ children }: { children: ReactNode }) {
  return <h1 className="text-3xl font-semibold tracking-tight text-ink">{children}</h1>;
}
