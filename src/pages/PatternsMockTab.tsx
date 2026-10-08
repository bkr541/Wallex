import SectionTitle from '../components/SectionTitle';
import { ActivityRingsDiagram, GaugeClusterDiagram, GlassDiagram, OrbitDiagram, PlanetDiagram, RibbonDiagram, RoseDiagram, ScaleRingDiagram, SpeedometerDiagram, TickHalosDiagram } from '../components/kit/patternsMock';

const DIAGRAMS = [
  { name: 'Glass bubbles', note: 'Each circle is a glass bubble that fills with liquid to its share of income. The centre ring is cut in the same colours.', Component: GlassDiagram },
  { name: 'Orbit map', note: 'A thick centre ring, a thin orbit round it, and a logo bead on the orbit for each item, joined to its slice by a spoke.', Component: OrbitDiagram },
  { name: 'Planets', note: 'Income is the sun. Every item is a planet on its own slow orbit, as big as what it costs.', Component: PlanetDiagram },
  { name: 'Rose', note: 'A polar bar chart: each item is a wedge pointing out from the centre, as long as its cost, with its logo and amount inside.', Component: RoseDiagram },
  { name: 'Ribbons', note: 'Solid discs in each colour, with a ribbon from every slice of the centre ring to its disc.', Component: RibbonDiagram },
  { name: 'Gauge cluster', note: 'An open dial with tick marks and a knob in the middle, and a thin ring gauge for every item around it, each ending in its own knob.', Component: GaugeClusterDiagram },
  { name: 'Activity rings', note: 'One thin ring per item, nested like watch rings with the biggest outermost, each ending in a knob that carries the logo.', Component: ActivityRingsDiagram },
  { name: 'Speedometer', note: 'A big open dial across the top for the income, and a row of ring gauges beneath it, one for each item.', Component: SpeedometerDiagram },
  { name: 'Tick halos', note: 'A dial in the middle, and each item a disc ringed by tick marks that light up for its share of the income.', Component: TickHalosDiagram },
  { name: 'Scale ring', note: 'A graduated bezel coloured one stretch per item, with each logo as a knob on its stretch, round a ring gauge for the spend.', Component: ScaleRingDiagram },
];

// Ten complete takes on the Patterns diagram. The centre and the circles around it are designed together, using the same
// example merchants and bills, so the only thing that changes from one to the next is the design.
export default function PatternsMockTab() {
  return (
    <div className="space-y-12 px-1 pb-10">
      <div className="px-3">
        <SectionTitle icon="layers-1">Patterns</SectionTitle>
        <p className="mt-1 font-support text-sm text-muted">Ten complete takes on the Patterns diagram. Each one designs the centre and the circles around it as one piece. The last five are built from the Ring Gauge and Gauge Dial.</p>
      </div>
      {DIAGRAMS.map((d, i) => (
        <section key={d.name}>
          <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3">
            <span className="font-support text-xs tracking-widest text-muted">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="text-base font-semibold">{d.name}</h3>
            <p className="font-support text-sm text-muted">{d.note}</p>
          </div>
          <div className="px-3"><d.Component /></div>
        </section>
      ))}
    </div>
  );
}
