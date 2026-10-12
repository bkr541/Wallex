import React, { useEffect, useState } from 'react';
import SectionTitle from '../components/SectionTitle';
import { ChevronDown } from 'lucide-react';
import PlumpIcon, { type PlumpName } from '../components/PlumpIcon';
import { BANKS } from '../lib/banks';
import { wallex } from '../lib/wallex';

const inputClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-accent';

function Field({ label, icon, hint, children }: { label: string; icon: PlumpName; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-sm font-medium">
        <PlumpIcon name={icon} className="h-5 w-5 shrink-0 text-muted" />
        {label}
      </span>
      {children}
      {hint && <span className="mt-1.5 block font-support text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} cursor-pointer appearance-none pr-10`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

export default function SetupTab({ onConnectionChange }: { onConnectionChange?: () => void }) {
  const [bankId, setBankId] = useState(BANKS[0].id);
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

  const bank = BANKS.find((b) => b.id === bankId) ?? BANKS[0];
  const canConnect = configured && !busy;

  async function handleConnect() {
    setBusy(true);
    setMessage(environment === 'production' ? { kind: 'info', text: 'Plaid Link is open. Finish signing in to your bank there.' } : null);
    const res = await wallex.connect({ bank });
    setBusy(false);

    if (!res.ok) return setMessage({ kind: 'error', text: res.error });
    if (!res.data.connected) return setMessage({ kind: 'info', text: 'Connection cancelled.' });

    const name = res.data.institutionName || bank.name;
    setLinked((l) => (l.includes(name) ? l : [...l, name]));
    setMessage({ kind: 'info', text: `Connected ${name}. Pick another bank above to link more.` });
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
          <p className="mt-1 font-support text-sm text-muted">
            Wallex links banks through Plaid. Your bank login goes to Plaid, never to Wallex, and the keys that unlock Plaid stay on
            Wallex’s server, so nothing secret is kept on this device.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-6 pl-12 @3xl:grid-cols-2">
          <Field label="Bank" icon="government-building-1" hint="Plaid Link opens with this bank pre-selected.">
            <Select value={bankId} onChange={setBankId} options={BANKS.map((b) => ({ value: b.id, label: b.name }))} />
          </Field>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-8">
        <button
          type="submit"
          disabled={!canConnect}
          className="cursor-pointer rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-canvas capitalize transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Connecting…' : linked.includes(bank.name) ? `Reconnect ${bank.name}` : linked.length > 0 ? `Add ${bank.name}` : `Connect ${bank.name}`}
        </button>
        {linked.length > 0 && (
          <span className="font-support text-sm text-accent">Linked: {linked.join(', ')}. Pick another bank to add more, or unlink one in Account.</span>
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
