import { useEffect, useState } from 'react';
import SectionTitle from '../components/SectionTitle';
import { wallex } from '../lib/wallex';

export default function SetupTab({ onConnectionChange }: { onConnectionChange?: () => void }) {
  const [linked, setLinked] = useState<string[]>([]); // names of the banks already linked
  const [configured, setConfigured] = useState(true);
  const [environment, setEnvironment] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  // What the server says is already linked. The Plaid keys themselves stay on the server and never reach this screen.
  useEffect(() => {
    wallex.getStatus().then((res) => {
      if (!res.ok) return setMessage({ kind: 'error', text: res.error });
      setConfigured(res.data.configured);
      setEnvironment(res.data.environment);
      setLinked(res.data.connections.map((c) => c.institutionName).filter(Boolean));
    });
  }, []);

  const canConnect = configured && !busy;

  async function handleConnect() {
    setBusy(true);
    setMessage(environment === 'production' ? { kind: 'info', text: 'Plaid Link is open. Finish signing in to your bank there.' } : null);
    const res = await wallex.connectAnother();
    setBusy(false);

    if (!res.ok) return setMessage({ kind: 'error', text: res.error });
    if (!res.data.connected) return setMessage({ kind: 'info', text: 'Connection cancelled.' });

    const name = res.data.institutionName || 'Your bank';
    setLinked((l) => (l.includes(name) ? l : [...l, name]));
    setMessage({ kind: 'info', text: `Connected ${name}.` });
    onConnectionChange?.();
  }

  return (
    <form
      className="w-full space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (canConnect) handleConnect();
      }}
    >
      <section className="space-y-5">
        <div>
          <SectionTitle icon="link-chain">Link a bank</SectionTitle>
          <p className="mt-1 font-support text-sm text-muted">Plaid handles your bank login. Wallex reads balances and transactions only.</p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-8">
        <button
          type="submit"
          disabled={!canConnect}
          className="cursor-pointer rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-canvas capitalize transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Connecting…' : linked.length > 0 ? 'Link Another Bank' : 'Link a Bank'}
        </button>
        {linked.length > 0 && (
          <span className="font-support text-sm text-accent">Linked: {linked.join(', ')}. Unlink a bank in Account.</span>
        )}
        {message && (
          <span className={`font-support text-sm ${message.kind === 'error' ? 'text-red-400' : 'text-muted'}`}>{message.text}</span>
        )}
        {!configured && !message && (
          <span className="font-support text-sm text-amber-300">Bank linking is not set up on the server yet. The Plaid keys need to be added there.</span>
        )}
        {environment === 'sandbox' && configured && (
          <span className="font-support text-xs text-muted">Test mode: this links a Plaid sandbox bank with made-up data.</span>
        )}
      </div>
    </form>
  );
}
