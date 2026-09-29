import React, { useEffect, useRef, useState } from 'react';

// Shared style tokens + helpers for the temporary Components style guide.

export const cardClass =
  'bg-white/95 rounded-3xl border border-white/80 shadow-[0_16px_40px_rgba(16,160,140,0.08),0_2px_12px_rgba(0,0,0,0.04)]';

export const inputClass =
  'w-full h-11 px-4 rounded-full bg-white border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#00c9a7] focus:ring-2 focus:ring-[#00c9a7]/25 transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed';

export const btn = {
  base: 'inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full text-sm font-semibold transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#00c9a7]/50 disabled:cursor-not-allowed',
  primary:
    'bg-[#00c9a7] text-white shadow-[0_8px_20px_rgba(0,201,167,0.3)] hover:bg-[#00bda0] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none',
  secondary: 'bg-[#dcf6f0] text-[#00bda0] hover:bg-[#c8f6ec]',
  outline: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50',
  ghost: 'text-slate-700 hover:bg-slate-100/70',
  danger: 'bg-red-500 text-white shadow-[0_8px_20px_rgba(239,68,68,0.28)] hover:bg-red-600',
  dangerSoft: 'bg-red-50 text-red-600 hover:bg-red-100',
  icon: 'w-11 h-11 p-0 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50',
};

export const menuPanelClass =
  'absolute z-30 mt-2 min-w-[12rem] p-1.5 rounded-2xl bg-white border border-slate-100 shadow-[0_16px_40px_rgba(16,160,140,0.14),0_2px_12px_rgba(0,0,0,0.06)]';

export const menuItemClass =
  'w-full flex items-center gap-2.5 px-3 h-9 rounded-xl text-sm text-slate-700 hover:bg-[#dcf6f0] hover:text-[#00bda0] transition cursor-pointer text-left';

export function Section({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-12 scroll-mt-4">
      <h2 className="text-xl font-semibold text-slate-800 tracking-tight">{title}</h2>
      <p className="text-sm text-slate-500 mt-1 mb-5 max-w-2xl">{description}</p>
      {children}
    </section>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">{children}</div>;
}

export function Swatches({ colors }: { colors: { name: string; hex: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4">
      {colors.map((c) => (
        <div key={c.hex} className="w-28">
          <div className="h-16 rounded-2xl border border-slate-200/70 shadow-sm" style={{ backgroundColor: c.hex }} />
          <div className="mt-2 text-sm font-medium text-slate-800">{c.name}</div>
          <div className="text-xs text-slate-500 uppercase">{c.hex}</div>
        </div>
      ))}
    </div>
  );
}

// Closes a popup when the user clicks outside of `ref` or presses Escape.
export function useDismiss(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  return ref;
}

export function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  return [on, () => setOn((v) => !v), setOn] as const;
}
