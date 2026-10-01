const INCOME = 5000;

interface Habit {
  name: string;
  amount: number;
  rgb: string; // "r, g, b" tint for the bubble
}

// Placeholder data until real merchants and bills are wired in.
const HABITS: Habit[] = [
  { name: 'Rent', amount: 1500, rgb: '74, 214, 130' },
  { name: 'Chase', amount: 1200, rgb: '79, 140, 255' },
  { name: 'Food', amount: 900, rgb: '255, 152, 67' },
  { name: 'Groceries', amount: 400, rgb: '250, 204, 21' },
  { name: 'Car', amount: 300, rgb: '45, 212, 191' },
  { name: 'Verizon', amount: 150, rgb: '168, 130, 255' },
  { name: 'Insurance', amount: 150, rgb: '56, 189, 248' },
  { name: 'Amazon', amount: 130, rgb: '251, 146, 60' },
  { name: 'Gas', amount: 100, rgb: '244, 114, 94' },
  { name: 'Gym', amount: 40, rgb: '163, 230, 53' },
  { name: 'Spotify', amount: 20, rgb: '255, 110, 170' },
  { name: 'Netflix', amount: 16, rgb: '239, 68, 68' },
].sort((a, b) => b.amount - a.amount);

const CENTER_RAW_DIAMETER = 52;
const MIN_RAW_DIAMETER = 14;

// How far circles may sink into each other, as a fraction of their combined radii.
const NEIGHBOR_OVERLAP = 0.14;
const CENTER_OVERLAP = 0.18;

interface Node {
  x: number;
  y: number;
  r: number;
}

// Area is proportional to spend, so diameter scales with the square root.
const rawDiameter = (amount: number) => Math.max(MIN_RAW_DIAMETER, Math.sqrt(amount));

// Packs the circles tightly around the income circle, letting them overlap a little.
// Deterministic, so the layout is computed once and never shifts between renders.
function buildLayout() {
  const centerR = CENTER_RAW_DIAMETER / 2;
  const nodes: Node[] = HABITS.map((h, i) => {
    const r = rawDiameter(h.amount) / 2;
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
    bubbles: HABITS.map((h, i) => ({
      ...h,
      left: 50 + nodes[i].x * scale,
      top: 50 + nodes[i].y * scale,
      diameter: nodes[i].r * 2 * scale,
    })),
  };
}

const LAYOUT = buildLayout();

const money = (n: number) => `$${n.toLocaleString('en-US')}`;

export default function PatternsTab() {
  return (
    <div className="flex h-full w-full items-start justify-center pb-4">
      <div
        role="img"
        aria-label={`Monthly income of ${money(INCOME)} surrounded by spending: ${HABITS.map(
          (h) => `${h.name} ${money(h.amount)}`,
        ).join(', ')}`}
        className="relative aspect-square"
        style={{ width: 'min(100%, calc(100vh - 15rem))', containerType: 'inline-size' }}
      >
        {LAYOUT.bubbles.map((b) => (
          <div
            key={b.name}
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
            <span className="font-support text-muted" style={{ fontSize: `${Math.max(1.6, b.diameter * 0.1)}cqw` }}>
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
            width: `${LAYOUT.centerDiameter}%`,
            height: `${LAYOUT.centerDiameter}%`,
          }}
        >
          <span className="font-support text-muted" style={{ fontSize: `${LAYOUT.centerDiameter * 0.07}cqw` }}>
            Monthly Income
          </span>
          <span className="font-semibold tracking-tight" style={{ fontSize: `${LAYOUT.centerDiameter * 0.12}cqw` }}>
            {money(INCOME)}
          </span>
        </div>
      </div>
    </div>
  );
}
