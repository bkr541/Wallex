import { useEffect, useState } from 'react';
import SectionTitle from '../components/SectionTitle';
import { RotateCcw } from 'lucide-react';
import LineLoader from '../components/loaders/LineLoader';
import { cashPosition } from '../lib/overview';
import type { Load } from '../lib/useTransactions';

// Shown when no bank is connected (the same figure as the sample Checking tab).
const SAMPLE_BALANCE = 6200.55;
// In the preview the data "arrives" after every scene has played once. At launch it arrives whenever Plaid answers.
const ARRIVES_MS = 12400;

function Preview({ balance }: { balance: number }) {
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setArrived(true), ARRIVES_MS);
    return () => clearTimeout(id);
  }, []);
  return <LineLoader balance={arrived ? balance : null} />;
}

// The loading screen shown when the app launches. Replay runs it again from the start.
export default function LoadingTab({ load }: { load: Load }) {
  const live = load.state === 'live' ? cashPosition(load.allAccounts).cash : null;
  const balance = live ?? SAMPLE_BALANCE;
  const [run, setRun] = useState(0);

  return (
    <div className="space-y-6 px-1 pb-10">
      <div className="px-3">
        <SectionTitle icon="loading-horizontal-2">Launch animation</SectionTitle>
        <p className="mt-1 font-support text-sm text-muted">
          Balance Line is the loading screen shown when the app starts.
        </p>
      </div>

      <section className="px-3">
        <div className="mb-3 flex items-baseline gap-3">
          <h3 className="text-base font-semibold">Balance line</h3>
          <button
            type="button"
            onClick={() => setRun((r) => r + 1)}
            className="ml-auto flex cursor-pointer items-center gap-1.5 font-support text-xs text-muted transition-colors hover:text-ink"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Replay
          </button>
        </div>
        <div className="flex h-72 items-center justify-center overflow-hidden rounded-2xl border border-line bg-canvas">
          <Preview key={run} balance={balance} />
        </div>
        <p className="mt-3 font-support text-sm text-muted">
          Five scenes play on a loop while your bank data loads: a line tracing upward, transactions dropping in and
          getting tagged as habits, recurring charges hopping along a timeline, a ring chart filling in, and a dashed
          forecast with payments landing on it. When the data arrives, the screen counts up to your available balance,
          holds for a moment, then hands over to the app. If no bank is linked it skips the ending.
        </p>
        <p className="mt-2 font-support text-sm text-muted">
          In this preview the data arrives after about 12 seconds so you can see every scene
          {live === null ? ', and the ending shows a sample balance because no bank is connected' : ''}.
        </p>
      </section>
    </div>
  );
}
