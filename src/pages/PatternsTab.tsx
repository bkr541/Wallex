const INCOME = 5000;

// Concentric orbit radii, as a percentage of the diagram width.
const RINGS = [24, 31, 37];

interface Habit {
  name: string;
  amount: number;
  rgb: string; // "r, g, b" tint for the bubble
  ring: number; // index into RINGS
  angle: number; // degrees, clockwise from 3 o'clock
  dotAngle: number; // where the small marker sits on the same ring
}

// Placeholder data until real merchants and bills are wired in.
const HABITS: Habit[] = [
  { name: 'Rent', amount: 1500, rgb: '74, 214, 130', ring: 2, angle: -50, dotAngle: -100 },
  { name: 'Chase', amount: 1200, rgb: '79, 140, 255', ring: 2, angle: -140, dotAngle: -125 },
  { name: 'Food', amount: 900, rgb: '255, 152, 67', ring: 2, angle: 20, dotAngle: -25 },
  { name: 'Verizon', amount: 150, rgb: '168, 130, 255', ring: 1, angle: 125, dotAngle: 150 },
  { name: 'Spotify', amount: 20, rgb: '255, 110, 170', ring: 2, angle: 88, dotAngle: 70 },
];

const CENTER_DIAMETER = 30;
const MIN_DIAMETER = 13;

// Area is proportional to spend, so diameter scales with the square root.
const diameterFor = (amount: number) => Math.max(MIN_DIAMETER, 0.62 * Math.sqrt(amount));

const polar = (radius: number, degrees: number) => {
  const rad = (degrees * Math.PI) / 180;
  return { x: 50 + radius * Math.cos(rad), y: 50 + radius * Math.sin(rad) };
};

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
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
          {RINGS.map((r) => (
            <circle
              key={r}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="0.25"
              strokeDasharray="1.2 1.2"
            />
          ))}
          {HABITS.map((h) => {
            const { x, y } = polar(RINGS[h.ring], h.dotAngle);
            return <circle key={h.name} cx={x} cy={y} r="1" fill={`rgb(${h.rgb})`} />;
          })}
        </svg>

        <div
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-line bg-card shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
          style={{ left: '50%', top: '50%', width: `${CENTER_DIAMETER}%`, height: `${CENTER_DIAMETER}%` }}
        >
          <span className="font-support text-muted" style={{ fontSize: '2cqw' }}>
            Monthly Income
          </span>
          <span className="font-semibold tracking-tight" style={{ fontSize: '5cqw' }}>
            {money(INCOME)}
          </span>
        </div>

        {HABITS.map((h) => {
          const d = diameterFor(h.amount);
          const { x, y } = polar(RINGS[h.ring], h.angle);
          const nameSize = Math.max(1.7, d * 0.1);
          const amountSize = Math.max(1.8, d * 0.13);
          return (
            <div
              key={h.name}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: `${d}%`,
                height: `${d}%`,
                background: `rgba(${h.rgb}, 0.14)`,
                border: `1.5px solid rgba(${h.rgb}, 0.7)`,
                boxShadow: `0 0 32px rgba(${h.rgb}, 0.28)`,
              }}
            >
              <span className="font-support text-muted" style={{ fontSize: `${nameSize}cqw` }}>
                {h.name}
              </span>
              <span className="font-semibold" style={{ fontSize: `${amountSize}cqw` }}>
                {money(h.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
