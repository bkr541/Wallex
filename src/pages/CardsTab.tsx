import { useState } from 'react';
import { AlertTriangle, BadgeCheck, CalendarClock, Plus, Sparkles } from 'lucide-react';
import SectionTitle from '../components/SectionTitle';

// Stat cards in five styles. They all show the same five figures as the status tiles at the top of the Recurring
// tab: how many payments Wallex is sure of, fairly sure of, has just seen, wants checked, and what they add up to
// each month. Click a card to select it, the way the tiles filter the Recurring list.

interface Stat {
  id: string;
  label: string;
  value: string;
  count?: number; // for the share-of-total card
  color: string;
  note: string;
  Icon: typeof BadgeCheck;
}

const TOTAL = 57; // 25 + 13 + 4 + 15
const STATS: Stat[] = [
  { id: 'confirmed', label: 'Confirmed', value: '25', count: 25, color: 'var(--accent)', note: 'Seen repeat and matched', Icon: BadgeCheck },
  { id: 'likely', label: 'Likely', value: '13', count: 13, color: '#6cc4ff', note: 'Looks like a pattern', Icon: Sparkles },
  { id: 'new', label: 'New', value: '4', count: 4, color: '#b9a2ff', note: 'First seen recently', Icon: Plus },
  { id: 'review', label: 'Needs review', value: '15', count: 15, color: '#f5c542', note: 'Wallex wants a look', Icon: AlertTriangle },
  { id: 'monthly', label: 'Est. monthly', value: '$8,685', color: 'var(--text)', note: '≈ $104,220 a year', Icon: CalendarClock },
];

function Row({ index, name, note, children }: { index: string; name: string; note: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3">
        <span className="font-support text-xs tracking-widest text-muted">{index}</span>
        <h3 className="text-base font-semibold">{name}</h3>
        <p className="font-support text-sm text-muted">{note}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 px-3 @3xl:grid-cols-5">{children}</div>
    </section>
  );
}

// Each card is a button that can be selected. `style` decides how one looks.
function Cards({ render }: { render: (s: Stat, selected: boolean) => React.ReactNode }) {
  const [on, setOn] = useState<string | null>(null);
  return (
    <>
      {STATS.map((s, i) => (
        <button
          key={s.id}
          type="button"
          aria-pressed={on === s.id}
          onClick={() => setOn((cur) => (cur === s.id ? null : s.id))}
          className={`min-w-0 cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-accent ${i === 4 ? 'col-span-2 @3xl:col-span-1' : ''}`}
        >
          {render(s, on === s.id)}
        </button>
      ))}
    </>
  );
}

/* 1 · Classic: the tiles as they are in Recurring today. */
function Classic() {
  return (
    <Cards
      render={(s, on) => (
        <span
          className={`block h-full rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 ${on ? 'border-accent' : 'border-line hover:border-muted'}`}
          style={on ? { boxShadow: '0 0 0 1px var(--accent)' } : undefined}
        >
          <span className="block font-support text-sm text-muted">{s.label}</span>
          <span className="mt-3 block text-4xl leading-none font-semibold tracking-tight tabular-nums" style={{ color: s.color }}>
            {s.value}
          </span>
        </span>
      )}
    />
  );
}

/* 2 · Accent edge: a thick coloured edge on the left and a line saying what the number means. */
function Edge() {
  return (
    <Cards
      render={(s, on) => (
        <span
          className={`relative block h-full overflow-hidden rounded-xl border bg-card py-4 pr-4 pl-5 transition-all hover:-translate-y-0.5 ${on ? 'border-ink/40' : 'border-line'}`}
        >
          <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: s.color }} />
          <span className="block font-support text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">{s.label}</span>
          <span className="mt-2 block text-3xl leading-none font-semibold tracking-tight tabular-nums">{s.value}</span>
          <span className="mt-2 block font-support text-xs text-muted">{s.note}</span>
        </span>
      )}
    />
  );
}

/* 3 · Icon chip: a round tinted icon at the top, number and label below. */
function Chip() {
  return (
    <Cards
      render={(s, on) => (
        <span
          className={`block h-full rounded-3xl border p-4 transition-all hover:-translate-y-0.5 ${on ? 'border-accent bg-accent-soft' : 'border-line bg-card'}`}
        >
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: `color-mix(in srgb, ${s.color} 16%, transparent)`, color: s.color }}
          >
            <s.Icon className="h-5 w-5" strokeWidth={2} />
          </span>
          <span className="mt-4 block text-3xl leading-none font-semibold tracking-tight tabular-nums">{s.value}</span>
          <span className="mt-1.5 block font-support text-sm text-muted">{s.label}</span>
        </span>
      )}
    />
  );
}

/* 4 · Glow: each card washed in its own colour, with a soft light in the corner. */
function Glow() {
  return (
    <Cards
      render={(s, on) => (
        <span
          className="relative block h-full overflow-hidden rounded-2xl border p-5 transition-all hover:-translate-y-0.5"
          style={{
            borderColor: `color-mix(in srgb, ${s.color} ${on ? 80 : 30}%, transparent)`,
            background: `linear-gradient(150deg, color-mix(in srgb, ${s.color} 16%, var(--card)), var(--card) 70%)`,
            boxShadow: on ? `0 0 28px color-mix(in srgb, ${s.color} 30%, transparent)` : undefined,
          }}
        >
          <span
            aria-hidden="true"
            className="absolute -top-8 -right-8 h-24 w-24 rounded-full blur-2xl"
            style={{ background: `color-mix(in srgb, ${s.color} 40%, transparent)` }}
          />
          <span className="relative flex items-center gap-2 font-support text-sm text-ink/80">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
          <span className="relative mt-3 block text-4xl leading-none font-semibold tracking-tight tabular-nums">{s.value}</span>
        </span>
      )}
    />
  );
}

/* 5 · Meter: how big each group is next to the others, as a bar and a percentage. */
function Meter() {
  return (
    <Cards
      render={(s, on) => {
        const share = s.count ? s.count / TOTAL : null;
        return (
          <span className={`block h-full rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 ${on ? 'border-accent' : 'border-line'}`}>
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-support text-sm text-muted">{s.label}</span>
              {share !== null && <span className="font-support text-xs text-muted tabular-nums">{Math.round(share * 100)}%</span>}
            </span>
            <span className="mt-2 block text-4xl leading-none font-semibold tracking-tight tabular-nums" style={{ color: s.color }}>
              {s.value}
            </span>
            <span className="mt-4 block h-1.5 overflow-hidden rounded-full bg-line">
              <span className="block h-full rounded-full" style={{ width: share !== null ? `${share * 100}%` : '100%', background: share !== null ? s.color : 'var(--muted)', opacity: share !== null ? 1 : 0.35 }} />
            </span>
            <span className="mt-2 block font-support text-xs text-muted">{share !== null ? `of ${TOTAL} patterns` : s.note}</span>
          </span>
        );
      }}
    />
  );
}

export default function CardsTab() {
  return (
    <div className="space-y-12 px-1 pb-12">
      <div className="px-3">
        <SectionTitle icon="layers-1">Stat cards</SectionTitle>
        <p className="mt-1 font-support text-sm text-muted">
          Five ways to style the status tiles from the Recurring tab. Each row shows the same five figures. Click a card
          to select it. The figures are samples.
        </p>
      </div>
      <Row index="01" name="Classic" note="The tiles as they are today: a small label and a big coloured number.">
        <Classic />
      </Row>
      <Row index="02" name="Accent edge" note="A thick coloured edge on the left, with a line saying what the number means.">
        <Edge />
      </Row>
      <Row index="03" name="Icon chip" note="A round tinted icon at the top, the number and the label beneath.">
        <Chip />
      </Row>
      <Row index="04" name="Glow" note="Each card washed in its own colour with a soft light in the corner.">
        <Glow />
      </Row>
      <Row index="05" name="Meter" note="A bar and a percentage show how big each group is next to the others.">
        <Meter />
      </Row>
    </div>
  );
}
