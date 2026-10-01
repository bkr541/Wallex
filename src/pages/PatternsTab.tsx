import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
  type Bubble,
  type PatternFilters,
  type View,
} from '../lib/patterns';

const MAX_CIRCLES = 14; // the biggest ones get a circle; the rest are counted in the summary line

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

// Sizes are in percent of the diagram's HEIGHT (the same unit as the text inside the circles).
// The smallest circle is always big enough to hold a logo and readable text. From there, circles
// grow with the amount, up to the biggest. Circle AREA tracks the square-root scale of the
// dollars, stretched across that whole range so the differences are easy to see.
const D_MIN = 19; // fits the logo, name, amount and percent
const D_MAX = 40;
const CENTER_D = 54; // the income circle

// How circles may overlap: neighbors sink into each other by this share of the smaller radius,
// and circles tuck behind the income circle but keep their centers (and text) outside it.
const NEIGHBOR_OVERLAP = 0.3;
const CENTER_TUCK = 0.75; // share of a circle's radius that may sit under the income circle

// The diagram is wider than it is tall.
const ASPECT = 1.5; // width / height
const FIT = 47; // how far from the middle the cluster may reach vertically

interface Pt {
  x: number;
  y: number;
  r: number;
}

// A small deterministic pseudo-random number, so the layout is the same on every render.
const jitter = (i: number) => {
  const x = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
  return x - Math.floor(x);
};

// Diameter for each amount: the smallest gets D_MIN, the biggest D_MAX.
function diameters(amounts: number[]): number[] {
  const roots = amounts.map(Math.sqrt);
  const lo = Math.min(...roots);
  const hi = Math.max(...roots);
  return roots.map((r) => D_MIN + (D_MAX - D_MIN) * (hi === lo ? 0.55 : (r - lo) / (hi - lo)));
}

// Packs circles into one loose cluster around the income circle. They are spread across the
// whole area and overlap their neighbors, rather than lining up in a ring.
function pack(ds: number[]): { nodes: Pt[]; fits: boolean } {
  const centerR = CENTER_D / 2;
  const nodes: Pt[] = ds.map((d, i) => {
    // Start on a loose spiral that reaches out across the area, with some scatter.
    const angle = i * 2.399963 + jitter(i) * 0.9;
    const dist = centerR * 0.95 + (D_MAX / 2) * 1.1 * Math.sqrt(i + 1) + jitter(i + 50) * (D_MAX / 2) * 0.4;
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, r: d / 2 };
  });

  for (let iter = 0; iter < 900; iter++) {
    // Gentle pull toward the middle, stronger vertically so the cluster comes out wide.
    for (const n of nodes) {
      n.x *= 0.996;
      n.y *= 0.991;
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const min = a.r + b.r - NEIGHBOR_OVERLAP * Math.min(a.r, b.r);
        if (dist < min) {
          const push = (min - dist) / 2 / dist;
          a.x -= dx * push;
          a.y -= dy * push;
          b.x += dx * push;
          b.y += dy * push;
        }
      }
    }
    for (const n of nodes) {
      const dist = Math.hypot(n.x, n.y) || 0.001;
      // Tuck behind the income circle, but never so far that its figures get covered.
      const min = centerR + n.r - Math.min(CENTER_TUCK * n.r, 0.28 * centerR);
      if (dist < min) {
        n.x *= min / dist;
        n.y *= min / dist;
      }
    }
  }

  const extentX = Math.max(centerR, ...nodes.map((n) => Math.abs(n.x) + n.r));
  const extentY = Math.max(centerR, ...nodes.map((n) => Math.abs(n.y) + n.r));
  return { nodes, fits: extentY <= FIT && extentX <= FIT * ASPECT };
}

// Lays out as many of the items (biggest first) as fit without shrinking any circle below D_MIN.
function buildLayout<T extends { amount: number }>(items: T[], maxCount: number) {
  let count = Math.min(items.length, maxCount);
  let result = { nodes: [] as Pt[], fits: true };
  let ds: number[] = [];
  for (; count >= 1; count--) {
    ds = diameters(items.slice(0, count).map((i) => i.amount));
    result = pack(ds);
    if (result.fits) break;
  }
  count = Math.max(count, Math.min(items.length, 1));

  return {
    centerDiameter: CENTER_D,
    bubbles: items.slice(0, count).map((h, i) => ({
      ...h,
      left: 50 + result.nodes[i].x / ASPECT,
      top: 50 + result.nodes[i].y,
      diameter: ds[i],
    })),
  };
}

// A text size in cqh that scales with the circle but never drops below a readable pixel size.
const cq = (d: number, factor: number, lo: number, hi: number, minPx: number) =>
  `max(${minPx}px, ${Math.min(hi, Math.max(lo, d * factor))}cqh)`;

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
  const box = { width: `max(26px, ${size}cqh)`, height: `max(26px, ${size}cqh)` };
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
  // Only real items get a circle. A lumped "Other" circle would be a different kind of thing and
  // would distort the sizes, so the smaller ones are summarised in text instead.
  const layout = useMemo(() => buildLayout(matching, MAX_CIRCLES), [matching]);
  const shown = layout.bubbles;
  const hidden = matching.slice(shown.length);
  const hiddenTotal = hidden.reduce((sum, b) => sum + b.amount, 0);

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
              {hidden.length > 0 && ` · showing the ${shown.length} biggest of ${matching.length} (${money(hiddenTotal)}/mo in the rest)`}
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
            height: `max(520px, min(calc(100vh - 20rem), calc((100vw - 12rem) / ${ASPECT})))`,
            width: `calc(max(520px, min(calc(100vh - 20rem), calc((100vw - 12rem) / ${ASPECT}))) * ${ASPECT})`,
            containerType: 'size',
          }}
        >
          <AnimatePresence>
          {layout.bubbles.map((b) => {
            const d = b.diameter;
            return (
              <motion.div
                key={b.key}
                initial={{ opacity: 0, scale: 0.35 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.35, transition: { duration: 0.25 } }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                title={`${b.name}: ${money(b.amount)}/mo · ${b.count} charge${b.count === 1 ? '' : 's'}${
                  base > 0 ? ` · ${percent(b.amount, base)} of ${hasIncome ? 'income' : 'spending'}` : ''
                }`}
                className="bubble bubble-move absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-center"
                style={
                  {
                    '--rgb': b.rgb,
                    left: `${b.left}%`,
                    top: `${b.top}%`,
                    width: `${d}cqh`,
                    height: `${d}cqh`,
                    gap: `${d * 0.012}cqh`,
                  } as React.CSSProperties
                }
              >
                <BubbleIcon bubble={b} size={Math.min(11, Math.max(5, d * 0.26))} />
                <span className="max-w-[90%] truncate font-medium" style={{ fontSize: cq(d, 0.085, 2.1, 3.4, 11) }}>
                  {b.name}
                </span>
                <span className="leading-none font-semibold" style={{ fontSize: cq(d, 0.14, 2.7, 5.6, 13) }}>
                  {money(b.amount)}
                </span>
                {base > 0 && (
                  <span className="font-support leading-none text-muted" style={{ fontSize: cq(d, 0.06, 1.8, 2.6, 10) }}>
                    {percent(b.amount, base)}
                    {d >= 27 ? ` of ${hasIncome ? 'income' : 'spending'}` : ''}
                  </span>
                )}
                {d >= 27 && (
                  <span
                    className="bubble-badge font-support"
                    style={{ fontSize: cq(d, 0.055, 1.8, 2.4, 10), padding: `${d * 0.012}cqh ${d * 0.04}cqh` }}
                  >
                    {b.badge}
                  </span>
                )}
              </motion.div>
            );
          })}
          </AnimatePresence>

          <div
            className="center-orb bubble-move pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full"
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
