import { useMemo } from 'react';
import type { Load } from '../lib/useTransactions';
import type { Txn } from '../lib/wallex';

interface Habit {
  key: string;
  name: string;
  amount: number;
  rgb: string; // "r, g, b" tint for the bubble
}

interface Summary {
  income: number;
  habits: Habit[];
}

// Shown until a bank is connected.
const SAMPLE: Summary = {
  income: 5000,
  habits: [
    { key: 'RENT', name: 'Rent', amount: 1500, rgb: '74, 214, 130' },
    { key: 'CHASE', name: 'Chase', amount: 1200, rgb: '79, 140, 255' },
    { key: 'FOOD', name: 'Food', amount: 900, rgb: '255, 152, 67' },
    { key: 'GROCERIES', name: 'Groceries', amount: 400, rgb: '250, 204, 21' },
    { key: 'CAR', name: 'Car', amount: 300, rgb: '45, 212, 191' },
    { key: 'VERIZON', name: 'Verizon', amount: 150, rgb: '168, 130, 255' },
    { key: 'INSURANCE', name: 'Insurance', amount: 150, rgb: '56, 189, 248' },
    { key: 'AMAZON', name: 'Amazon', amount: 130, rgb: '251, 146, 60' },
    { key: 'GAS', name: 'Gas', amount: 100, rgb: '244, 114, 94' },
    { key: 'GYM', name: 'Gym', amount: 40, rgb: '163, 230, 53' },
    { key: 'SPOTIFY', name: 'Spotify', amount: 20, rgb: '255, 110, 170' },
    { key: 'NETFLIX', name: 'Netflix', amount: 16, rgb: '239, 68, 68' },
  ],
};

const WINDOW_DAYS = 30;
const MAX_CIRCLES = 12;

// One color per Plaid primary category, so a category keeps its color as amounts change.
const CATEGORY_COLORS: Record<string, string> = {
  RENT_AND_UTILITIES: '74, 214, 130',
  LOAN_PAYMENTS: '79, 140, 255',
  FOOD_AND_DRINK: '255, 152, 67',
  GENERAL_MERCHANDISE: '250, 204, 21',
  TRANSPORTATION: '45, 212, 191',
  ENTERTAINMENT: '255, 110, 170',
  PERSONAL_CARE: '168, 130, 255',
  MEDICAL: '244, 114, 94',
  TRAVEL: '56, 189, 248',
  HOME_IMPROVEMENT: '163, 230, 53',
  GENERAL_SERVICES: '251, 146, 60',
  BANK_FEES: '239, 68, 68',
  GOVERNMENT_AND_NON_PROFIT: '129, 140, 248',
};
const FALLBACK_COLOR = '148, 163, 184';

// Friendlier names for Plaid's longer category labels.
const SHORT_NAMES: Record<string, string> = {
  'General Merchandise': 'Shopping',
  'Rent & Utilities': 'Rent & Bills',
  'Government & Non Profit': 'Government',
  'General Services': 'Services',
  'Home Improvement': 'Home',
  'Loan Payments': 'Loans',
};

const isoDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Money moving between your own accounts and credit card bill payments are not spending.
const isSpending = (t: Txn) =>
  t.amount < 0 &&
  t.categoryKey !== 'TRANSFER_OUT' &&
  t.categoryKey !== 'TRANSFER_IN' &&
  t.categoryDetailKey !== 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT';

// Totals the last 30 days: income in the middle, spending grouped by Plaid category around it.
function summarize(transactions: Txn[]): Summary {
  const since = isoDaysAgo(WINDOW_DAYS);
  const recent = transactions.filter((t) => t.date >= since);

  const income = recent.filter((t) => t.amount > 0 && t.categoryKey === 'INCOME').reduce((sum, t) => sum + t.amount, 0);

  const totals = new Map<string, Habit>();
  for (const t of recent.filter(isSpending)) {
    const key = t.categoryKey || 'UNCATEGORIZED';
    const label = t.category.split(' › ')[0];
    const habit = totals.get(key) ?? {
      key,
      name: SHORT_NAMES[label] ?? label,
      amount: 0,
      rgb: CATEGORY_COLORS[key] ?? FALLBACK_COLOR,
    };
    habit.amount += -t.amount;
    totals.set(key, habit);
  }

  const sorted = [...totals.values()].filter((h) => h.amount >= 1).sort((a, b) => b.amount - a.amount);
  let habits = sorted;
  if (sorted.length > MAX_CIRCLES) {
    const rest = sorted.slice(MAX_CIRCLES - 1);
    habits = [
      ...sorted.slice(0, MAX_CIRCLES - 1),
      { key: 'OTHER', name: 'Other', amount: rest.reduce((sum, h) => sum + h.amount, 0), rgb: FALLBACK_COLOR },
    ];
  }
  return { income, habits };
}

const CENTER_RAW_DIAMETER = 52;
const MIN_RAW_DIAMETER = 14;
const LARGEST_RAW_DIAMETER = 38;

// How far circles may sink into each other, as a fraction of their combined radii.
const NEIGHBOR_OVERLAP = 0.14;
const CENTER_OVERLAP = 0.18;

interface Node {
  x: number;
  y: number;
  r: number;
}

// Packs the circles tightly around the income circle, letting them overlap a little.
// Deterministic for a given input, so the layout never shifts between renders.
function buildLayout(habits: Habit[]) {
  const centerR = CENTER_RAW_DIAMETER / 2;
  const largest = Math.max(1, ...habits.map((h) => h.amount));

  // Area is proportional to spend, so diameter scales with the square root.
  const nodes: Node[] = habits.map((h, i) => {
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

  // Scale the whole cluster so it fills the diagram (percent of its width, centered at 50).
  const extent = Math.max(centerR, ...nodes.map((n) => Math.hypot(n.x, n.y) + n.r));
  const scale = 48 / extent;

  return {
    centerDiameter: CENTER_RAW_DIAMETER * scale,
    bubbles: habits.map((h, i) => ({
      ...h,
      left: 50 + nodes[i].x * scale,
      top: 50 + nodes[i].y * scale,
      diameter: nodes[i].r * 2 * scale,
    })),
  };
}

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export default function PatternsTab({ load }: { load: Load }) {
  const live = load.state === 'live';
  const summary = useMemo(() => (load.state === 'live' ? summarize(load.transactions) : SAMPLE), [load]);
  const layout = useMemo(() => buildLayout(summary.habits), [summary]);

  const totalSpent = summary.habits.reduce((sum, h) => sum + h.amount, 0);
  // With no income in the window, the middle shows total spending instead.
  const centerLabel = summary.income > 0 || !live ? 'Monthly Income' : `Spent · ${WINDOW_DAYS} days`;
  const centerAmount = summary.income > 0 || !live ? summary.income : totalSpent;

  const caption =
    load.state === 'loading'
      ? 'Loading your spending…'
      : load.state === 'sample'
        ? load.note
        : `Last ${WINDOW_DAYS} days · ${load.bank}. Transfers and credit card payments are left out.`;

  if (live && summary.habits.length === 0) {
    return (
      <p className="px-4 py-6 font-support text-sm text-muted">
        No spending found in the last {WINDOW_DAYS} days for this account.
      </p>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center pb-4">
      <p
        className={`pb-3 font-support text-sm ${load.state === 'sample' && load.isError ? 'text-red-400' : 'text-muted'}`}
      >
        {caption}
      </p>
      <div
        role="img"
        aria-label={`${centerLabel} of ${money(centerAmount)} surrounded by spending: ${summary.habits
          .map((h) => `${h.name} ${money(h.amount)}`)
          .join(', ')}`}
        className="relative aspect-square"
        style={{ width: 'min(100%, calc(100vh - 17rem))', containerType: 'inline-size' }}
      >
        {layout.bubbles.map((b) => (
          <div
            key={b.key}
            title={`${b.name}: ${money(b.amount)}${
              summary.income > 0 ? ` (${Math.round((b.amount / summary.income) * 100)}% of income)` : ''
            }`}
            className="bubble absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full"
            style={
              {
                '--rgb': b.rgb,
                left: `${b.left}%`,
                top: `${b.top}%`,
                width: `${b.diameter}%`,
                height: `${b.diameter}%`,
              } as React.CSSProperties
            }
          >
            <span
              className="max-w-[88%] truncate font-support text-muted"
              style={{ fontSize: `${Math.max(1.6, b.diameter * 0.1)}cqw` }}
            >
              {b.name}
            </span>
            <span className="font-semibold" style={{ fontSize: `${Math.max(1.8, b.diameter * 0.13)}cqw` }}>
              {money(b.amount)}
            </span>
          </div>
        ))}

        <div
          className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-line bg-card shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
          style={{
            left: '50%',
            top: '50%',
            width: `${layout.centerDiameter}%`,
            height: `${layout.centerDiameter}%`,
          }}
        >
          <span className="font-support text-muted" style={{ fontSize: `${layout.centerDiameter * 0.07}cqw` }}>
            {centerLabel}
          </span>
          <span className="font-semibold tracking-tight" style={{ fontSize: `${layout.centerDiameter * 0.12}cqw` }}>
            {money(centerAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}
