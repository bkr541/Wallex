import '../foundations.css';

type Swatch = { name: string; hex: string; fill?: string };

const GROUPS: { title: string; swatches: Swatch[] }[] = [
  {
    title: 'Surfaces',
    swatches: [
      { name: 'Canvas / nav', hex: '#121315' },
      { name: 'Card', hex: '#1a1b1d' },
      { name: 'Card highlight', hex: '#202123' },
      { name: 'Surface', hex: '#232427' },
      { name: 'Surface 2', hex: '#292a2d' },
      { name: 'Surface 3', hex: '#303236' },
    ],
  },
  {
    title: 'Text',
    swatches: [
      { name: 'Text', hex: '#f3f3f2' },
      { name: 'Text 2', hex: '#b7b8ba' },
      { name: 'Text 3', hex: '#7d7f83' },
    ],
  },
  {
    title: 'Accent & status',
    swatches: [
      { name: 'Accent', hex: '#5ce6d1' },
      { name: 'Accent 2', hex: '#88efe0' },
      { name: 'Accent soft', hex: '16%', fill: 'rgba(92,230,209,.16)' },
      { name: 'Warning', hex: '#e6b85c' },
      { name: 'Danger', hex: '#ff6b72' },
      { name: 'Danger soft', hex: '14%', fill: 'rgba(255,107,114,.14)' },
    ],
  },
  {
    title: 'Lines',
    swatches: [
      { name: 'Line', hex: '6.5%', fill: 'rgba(255,255,255,.065)' },
      { name: 'Line strong', hex: '10%', fill: 'rgba(255,255,255,.10)' },
    ],
  },
];

const TYPE = [
  { label: 'Page heading', size: 30, weight: 600, spec: '30 / 600' },
  { label: 'Heading', size: 22, weight: 630, spec: '22 / 630' },
  { label: 'Card title', size: 14, weight: 620, spec: '14 / 620' },
  { label: 'Control', size: 11, weight: 560, spec: '11 / 560' },
  { label: 'Caption', size: 8, weight: 400, spec: '8 / 400' },
];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="component-card">
      <header className="component-header">
        <span className="component-title">{title}</span>
      </header>
      <div className="component-stage center">{children}</div>
    </article>
  );
}

export default function Foundations() {
  return (
    <section className="view-panel" data-view="foundations">
      <div className="component-grid">
        {GROUPS.map((g) => (
          <Card key={g.title} title={g.title}>
            <div className="fnd-list">
              {g.swatches.map((s) => (
                <div key={s.name} className="fnd-row">
                  <i className="fnd-chip" style={{ background: s.fill ?? s.hex }} />
                  <b>{s.name}</b>
                  <small>{s.hex}</small>
                </div>
              ))}
            </div>
          </Card>
        ))}

        <Card title="Shape & elevation">
          <div style={{ display: 'grid', gap: 16, justifyItems: 'center' }}>
            <div className="fnd-shapes">
              <div><i style={{ width: 56, height: 40, borderRadius: 24 }} />Card 24</div>
              <div><i style={{ width: 56, height: 40, borderRadius: 12 }} />Control 12</div>
              <div><i style={{ width: 56, height: 28, borderRadius: 999 }} />Pill</div>
            </div>
            <div className="fnd-elevation">Card shadow</div>
          </div>
        </Card>

        <Card title="Type scale">
          <div className="fnd-type">
            {TYPE.map((t) => (
              <div key={t.label}>
                <span style={{ fontSize: t.size, fontWeight: t.weight, letterSpacing: '-.02em', lineHeight: 1.1 }}>
                  {t.label}
                </span>
                <small>{t.spec}</small>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
