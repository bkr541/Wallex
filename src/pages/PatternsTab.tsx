import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Briefcase,
  Building2,
  Banknote,
  Car,
  Clapperboard,
  Coffee,
  Dumbbell,
  Fuel,
  Hammer,
  HeartPulse,
  Home,
  Landmark,
  Music,
  Package,
  Plane,
  Scissors,
  Search,
  Shapes,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Smartphone,
  Utensils,
  Wallet,
  Wine,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import ChaseLogo from '../components/ChaseLogo';
import MerchantLogo from '../components/MerchantLogo';
import type { Load } from '../lib/useTransactions';
import {
  DEFAULT_FILTERS,
  SAMPLE_PATTERNS,
  buildPatterns,
  capBubbles,
  type Bubble,
  type PatternFilters,
  type View,
} from '../lib/patterns';

const MAX_CIRCLES = 14;

// Icons per Plaid category, plus a few for the sample circles.
const ICONS: Record<string, LucideIcon | 'chase'> = {
  RENT_AND_UTILITIES: Home,
  LOAN_PAYMENTS: Landmark,
  FOOD_AND_DRINK: Utensils,
  GENERAL_MERCHANDISE: ShoppingBag,
  TRANSPORTATION: Car,
  ENTERTAINMENT: Clapperboard,
  PERSONAL_CARE: Scissors,
  MEDICAL: HeartPulse,
  TRAVEL: Plane,
  HOME_IMPROVEMENT: Hammer,
  GENERAL_SERVICES: Briefcase,
  BANK_FEES: Banknote,
  GOVERNMENT_AND_NON_PROFIT: Building2,
  RENT: Home,
  ELECTRIC: Zap,
  WOOFS: Wine,
  STARBUCKS: Coffee,
  PUBLIX: ShoppingCart,
  OTHER: Shapes,
  TRANSFER_OUT: Banknote,
  CHASE: 'chase',
  FOOD: Utensils,
  GROCERIES: ShoppingCart,
  CAR: Car,
  VERIZON: Smartphone,
  INSURANCE: ShieldCheck,
  AMAZON: Package,
  GAS: Fuel,
  GYM: Dumbbell,
  SPOTIFY: Music,
  NETFLIX: Clapperboard,
};

const CENTER_RAW_DIAMETER = 52;
const MIN_RAW_DIAMETER = 16;
const LARGEST_RAW_DIAMETER = 38;

// How far circles may sink into each other, as a fraction of their combined radii.
const NEIGHBOR_OVERLAP = 0.05;
const CENTER_OVERLAP = 0.1;

// The diagram is wider than it is tall, and positions are stretched sideways to use that room.
const ASPECT = 1.5; // width / height
const SPREAD = 1.3;

interface Pt {
  x: number;
  y: number;
  r: number;
}

// Packs the circles around the income circle. Deterministic for a given input, so the layout
// never shifts between renders. All sizes are in percent of the diagram's HEIGHT.
function buildLayout<T extends { amount: number }>(habits: T[]) {
  const centerR = CENTER_RAW_DIAMETER / 2;
  const largest = Math.max(1, ...habits.map((h) => h.amount));

  // Area is proportional to spend, so diameter scales with the square root.
  const nodes: Pt[] = habits.map((h, i) => {
    const d = Math.max(MIN_RAW_DIAMETER, LARGEST_RAW_DIAMETER * Math.sqrt(h.amount / largest));
    const r = d / 2;
    const angle = i * 2.399963; // golden angle spreads the starting points evenly
    return { x: Math.cos(angle) * (centerR + r), y: Math.sin(angle) * (centerR + r), r };
  });

  for (let iter = 0; iter < 400; iter++) {
    for (const n of nodes) {
      n.x *= 0.985;
      n.y *= 0.985;
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.001;
        const min = (a.r + b.r) * (1 - NEIGHBOR_OVERLAP);
        if (d < min) {
          const push = (min - d) / 2 / d;
          a.x -= dx * push;
          a.y -= dy * push;
          b.x += dx * push;
          b.y += dy * push;
        }
      }
    }
    for (const n of nodes) {
      const d = Math.hypot(n.x, n.y) || 0.001;
      const min = (centerR + n.r) * (1 - CENTER_OVERLAP);
      if (d < min) {
        n.x *= min / d;
        n.y *= min / d;
      }
    }
  }

  for (const n of nodes) n.x *= SPREAD;

  // Fit the whole cluster inside the diagram.
  const extentX = Math.max(centerR, ...nodes.map((n) => Math.abs(n.x) + n.r));
  const extentY = Math.max(centerR, ...nodes.map((n) => Math.abs(n.y) + n.r));
  const scale = Math.min(47 / extentY, (47 * ASPECT) / extentX);

  return {
    centerDiameter: CENTER_RAW_DIAMETER * scale,
    bubbles: habits.map((h, i) => ({
      ...h,
      left: 50 + (nodes[i].x * scale) / ASPECT,
      top: 50 + nodes[i].y * scale,
      diameter: nodes[i].r * 2 * scale,
    })),
  };
}

const money = (n: number) =>
  n < 100 && !Number.isInteger(n)
    ? `$${n.toFixed(2)}`
    : `$${Math.round(n).toLocaleString('en-US')}`;

const percent = (amount: number, base: number) => {
  const p = (amount / base) * 100;
  return p < 1 ? '<1%' : `${Math.round(p)}%`;
};

const VIEWS: { id: View; label: string; dot?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'bills', label: 'Bills', dot: '#4fa3ff' },
  { id: 'merchants', label: 'Merchants', dot: '#a67cff' },
  { id: 'categories', label: 'Categories', dot: '#4fb8a5' },
];

function BubbleIcon({ bubble, size }: { bubble: Bubble; size: number }) {
  const icon = bubble.iconKey ? (ICONS[bubble.iconKey] ?? Shapes) : null;
  const box = { width: `${size}cqh`, height: `${size}cqh` };
  if (!icon) {
    return (
      <span className="bubble-icon" style={box}>
        <MerchantLogo
          key={bubble.key}
          name={bubble.name}
          sources={bubble.logos}
          className="h-full w-full border-0"
          style={{ fontSize: `${size * 0.36}cqh` }}
        />
      </span>
    );
  }
  const Icon = icon === 'chase' ? null : icon;
  return (
    <span className="bubble-icon" style={box}>
      {Icon ? (
        <Icon className="h-[58%] w-[58%]" style={{ color: `rgb(${bubble.rgb})` }} strokeWidth={1.8} />
      ) : (
        <ChaseLogo className="h-[62%] w-[62%]" />
      )}
    </span>
  );
}

function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  disabled,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; disabled?: boolean; hint?: string }[];
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          disabled={disabled || o.disabled}
          title={o.hint}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            value === o.value ? 'bg-accent text-canvas' : 'bg-surface text-muted hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function PatternsTab({ load }: { load: Load }) {
  const live = load.state === 'live';
  const [view, setView] = useState<View>('all');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<PatternFilters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close the popover on an outside click or Escape.
  useEffect(() => {
    if (!filterOpen) return;
    const onDown = (e: PointerEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFilterOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [filterOpen]);

  const data = useMemo(
    () => (load.state === 'live' ? buildPatterns(load.allTransactions, load.allAccounts, filters) : SAMPLE_PATTERNS),
    [load, filters],
  );

  const pool = useMemo(() => {
    const all = [...data.bills, ...data.merchants].sort((a, b) => b.amount - a.amount);
    return view === 'bills' ? data.bills : view === 'merchants' ? data.merchants : view === 'categories' ? data.categories : all;
  }, [data, view]);

  const q = query.trim().toLowerCase();
  const matching = useMemo(() => (q ? pool.filter((b) => b.name.toLowerCase().includes(q)) : pool), [pool, q]);
  const shown = useMemo(() => capBubbles(matching, MAX_CIRCLES, 'Other'), [matching]);
  const layout = useMemo(() => buildLayout(shown), [shown]);

  // Everything is measured against monthly income. With no income found, against total spending.
  const total = matching.reduce((sum, b) => sum + b.amount, 0);
  const hasIncome = data.income > 0;
  const base = hasIncome ? data.income : total;
  const centerLabel = hasIncome ? 'Monthly Income' : 'Monthly spending';
  const centerAmount = base;
  const viewLabel = VIEWS.find((v) => v.id === view)!.label;

  const activeFilters =
    (filters.days !== 30 ? 1 : 0) + (filters.account !== 'all' ? 1 : 0) + (filters.minAmount > 0 ? 1 : 0) + (filters.categories.length ? 1 : 0);

  const caption =
    load.state === 'loading'
      ? 'Loading your spending…'
      : load.state === 'sample'
        ? load.note
        : `Last ${filters.days} days, averaged per month · ${load.bank}${data.hasCredit ? ' · credit cards included' : ''}.`;

  const countFor = (id: View) =>
    id === 'bills' ? data.bills.length : id === 'merchants' ? data.merchants.length : id === 'categories' ? data.categories.length : data.bills.length + data.merchants.length;

  const empty = live && shown.length === 0;

  return (
    <div className="flex h-full w-full flex-col items-center pb-4">
      <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4">
        <div role="tablist" aria-label="Show" className="flex flex-wrap gap-2">
          {VIEWS.map((v) => {
            const selected = v.id === view;
            return (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setView(v.id)}
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
                  selected ? 'border-transparent bg-accent text-canvas' : 'border-line bg-card text-ink hover:bg-surface'
                }`}
              >
                {v.dot && <span className="h-2.5 w-2.5 rounded-full" style={{ background: v.dot }} />}
                {v.label}
                <span className="opacity-60">{countFor(v.id)}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 rounded-xl border border-line bg-card px-3.5 py-2.5">
            <Search className="h-4 w-4 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search recurring transactions…"
              className="w-60 bg-transparent text-sm outline-none placeholder:text-muted select-text"
            />
          </label>

          <div ref={filterRef} className="relative">
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={filterOpen}
              onClick={() => setFilterOpen((o) => !o)}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors ${
                filterOpen ? 'border-accent bg-surface' : 'border-line bg-card hover:bg-surface'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filter
              {activeFilters > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-canvas">
                  {activeFilters}
                </span>
              )}
            </button>

            {filterOpen && (
              <div
                role="dialog"
                aria-label="Filter patterns"
                className="absolute top-full right-0 z-50 mt-2 w-[22rem] space-y-5 rounded-2xl border border-line bg-card p-5 shadow-[0_24px_60px_rgba(0,0,0,0.65)]"
              >
                {!live && (
                  <p className="font-support text-xs text-muted">Connect your bank to filter your own spending.</p>
                )}

                <div className={`space-y-5 ${live ? '' : 'pointer-events-none opacity-50'}`}>
                  <section>
                    <h3 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Period</h3>
                    <Segmented
                      value={filters.days}
                      onChange={(days) => setFilters((f) => ({ ...f, days }))}
                      options={[
                        { value: 30, label: '30 days' },
                        { value: 60, label: '60 days' },
                        { value: 90, label: '90 days' },
                      ]}
                    />
                  </section>

                  <section>
                    <h3 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Account</h3>
                    <Segmented
                      value={filters.account}
                      onChange={(account) => setFilters((f) => ({ ...f, account }))}
                      options={[
                        { value: 'all', label: 'All' },
                        { value: 'checking', label: 'Checking' },
                        {
                          value: 'credit',
                          label: 'Credit cards',
                          disabled: !data.hasCredit,
                          hint: data.hasCredit ? undefined : 'No credit card is linked',
                        },
                      ]}
                    />
                  </section>

                  <section>
                    <h3 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Minimum per month</h3>
                    <Segmented
                      value={filters.minAmount}
                      onChange={(minAmount) => setFilters((f) => ({ ...f, minAmount }))}
                      options={[
                        { value: 0, label: 'Any' },
                        { value: 25, label: '$25' },
                        { value: 50, label: '$50' },
                        { value: 100, label: '$100' },
                      ]}
                    />
                  </section>

                  {data.categoryOptions.length > 0 && (
                    <section>
                      <h3 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Categories</h3>
                      <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                        {data.categoryOptions.map((c) => {
                          const on = filters.categories.includes(c.key);
                          return (
                            <button
                              key={c.key}
                              type="button"
                              aria-pressed={on}
                              onClick={() =>
                                setFilters((f) => ({
                                  ...f,
                                  categories: on ? f.categories.filter((k) => k !== c.key) : [...f.categories, c.key],
                                }))
                              }
                              className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs transition-colors ${
                                on ? 'bg-accent text-canvas' : 'bg-surface text-muted hover:text-ink'
                              }`}
                            >
                              {c.label}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-line pt-3">
                  <button
                    type="button"
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    disabled={activeFilters === 0}
                    className="cursor-pointer text-sm text-muted hover:text-ink disabled:cursor-default disabled:opacity-40"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterOpen(false)}
                    className="cursor-pointer rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-canvas"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex w-full flex-wrap items-baseline justify-between gap-2 px-4 font-support text-sm">
        <p className={load.state === 'sample' && load.isError ? 'text-red-400' : 'text-muted'}>{caption}</p>
        {!empty && base > 0 && (
          <p>
            <span className="text-muted">{viewLabel}: </span>
            <span className="font-semibold">{money(total)}</span>
            <span className="text-muted">
              {' '}
              /mo · {percent(total, base)} of {hasIncome ? 'income' : 'spending'}
            </span>
          </p>
        )}
      </div>

      {empty ? (
        <p className="px-4 py-10 font-support text-sm text-muted">
          {q || activeFilters > 0 ? 'Nothing matches your search and filters.' : `No spending found in the last ${filters.days} days.`}
        </p>
      ) : (
        <div
          role="img"
          aria-label={`${centerLabel} of ${money(centerAmount)} with ${viewLabel.toLowerCase()}: ${shown
            .map((b) => `${b.name} ${money(b.amount)}`)
            .join(', ')}`}
          className="relative mt-2"
          style={{
            // Height is capped by the window; width follows from the aspect ratio.
            height: `min(calc(100vh - 20rem), calc((100vw - 12rem) / ${ASPECT}))`,
            width: `calc(min(calc(100vh - 20rem), calc((100vw - 12rem) / ${ASPECT})) * ${ASPECT})`,
            containerType: 'size',
          }}
        >
          {layout.bubbles.map((b) => {
            const d = b.diameter;
            return (
              <div
                key={`${view}-${b.key}`}
                title={`${b.name}: ${money(b.amount)}/mo · ${b.count} charge${b.count === 1 ? '' : 's'}${
                  base > 0 ? ` · ${percent(b.amount, base)} of ${hasIncome ? 'income' : 'spending'}` : ''
                }`}
                className="bubble absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-center"
                style={
                  {
                    '--rgb': b.rgb,
                    left: `${b.left}%`,
                    top: `${b.top}%`,
                    width: `${d}cqh`,
                    height: `${d}cqh`,
                    gap: `${d * 0.015}cqh`,
                  } as React.CSSProperties
                }
              >
                {d >= 13 && <BubbleIcon bubble={b} size={Math.min(8, d * 0.2)} />}
                <span className="max-w-[88%] truncate font-medium" style={{ fontSize: `${Math.max(1.5, d * 0.075)}cqh` }}>
                  {b.name}
                </span>
                <span className="leading-none font-semibold" style={{ fontSize: `${Math.max(1.8, d * 0.12)}cqh` }}>
                  {money(b.amount)}
                </span>
                {base > 0 && (
                  <span className="font-support leading-none text-muted" style={{ fontSize: `${Math.max(1.3, d * 0.058)}cqh` }}>
                    {percent(b.amount, base)}
                    {d >= 19 ? ` of ${hasIncome ? 'income' : 'spending'}` : ''}
                  </span>
                )}
                {d >= 21 && (
                  <span
                    className="bubble-badge font-support"
                    style={{ fontSize: `${Math.max(1.3, d * 0.055)}cqh`, padding: `${d * 0.012}cqh ${d * 0.04}cqh` }}
                  >
                    {b.badge}
                  </span>
                )}
              </div>
            );
          })}

          <div
            className="center-orb pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full"
            style={{
              left: '50%',
              top: '50%',
              width: `${layout.centerDiameter}cqh`,
              height: `${layout.centerDiameter}cqh`,
              gap: `${layout.centerDiameter * 0.02}cqh`,
            }}
          >
            <span
              className="bubble-icon"
              style={{
                width: `${layout.centerDiameter * 0.17}cqh`,
                height: `${layout.centerDiameter * 0.17}cqh`,
                ['--rgb' as string]: '79, 184, 165',
              }}
            >
              <Wallet className="h-[56%] w-[56%] text-accent" strokeWidth={1.8} />
            </span>
            <span className="font-support text-muted" style={{ fontSize: `${layout.centerDiameter * 0.065}cqh` }}>
              {centerLabel}
            </span>
            <span className="leading-none font-semibold tracking-tight" style={{ fontSize: `${layout.centerDiameter * 0.14}cqh` }}>
              {money(centerAmount)}
            </span>
            <span className="font-support leading-none text-muted" style={{ fontSize: `${layout.centerDiameter * 0.058}cqh` }}>
              100%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
