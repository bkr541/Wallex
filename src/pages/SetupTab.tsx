import React, { useEffect, useState } from 'react';
import SectionTitle from '../components/SectionTitle';
import { Check, ChevronDown, Eye, EyeOff } from 'lucide-react';
import UnderlineField from '../components/UnderlineField';
import PlumpIcon, { type PlumpName } from '../components/PlumpIcon';
import { BANKS } from '../lib/banks';
import { wallex } from '../lib/wallex';

const ENVIRONMENTS = [
  { value: 'sandbox', label: 'Sandbox (test data)' },
  { value: 'production', label: 'Production (real accounts)' },
];

const PRODUCTS = [
  { value: 'transactions', label: 'Transactions' },
  { value: 'auth', label: 'Auth (account & routing numbers)' },
  { value: 'balance', label: 'Balance' },
  { value: 'identity', label: 'Identity' },
];

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'IE', label: 'Ireland' },
  { value: 'FR', label: 'France' },
  { value: 'ES', label: 'Spain' },
  { value: 'NL', label: 'Netherlands' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'nl', label: 'Dutch' },
];

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

function CheckGroup({
  legend,
  icon,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  icon: PlumpName;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 flex items-center gap-2 text-sm font-medium">
        <PlumpIcon name={icon} className="h-5 w-5 shrink-0 text-muted" />
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onToggle(o.value)}
              className={`flex cursor-pointer items-center gap-1.5 rounded-full border py-1.5 pr-3.5 pl-2 text-sm transition-colors ${
                on ? 'border-accent text-ink' : 'border-line text-muted hover:text-ink'
              }`}
            >
              <span className={`flex h-4 w-4 items-center justify-center rounded-full ${on ? 'bg-accent text-canvas' : 'bg-line'}`}>
                {on && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

export default function SetupTab({ onConnectionChange }: { onConnectionChange?: () => void }) {
  const [environment, setEnvironment] = useState('production');
  const [clientId, setClientId] = useState('');
  const [secret, setSecret] = useState('');
  const [hasSavedSecret, setHasSavedSecret] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [bankId, setBankId] = useState(BANKS[0].id);
  const [products, setProducts] = useState<string[]>(['transactions']);
  const [countries, setCountries] = useState<string[]>(['US']);
  const [language, setLanguage] = useState('en');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [redirectUri, setRedirectUri] = useState('');

  const [connectedTo, setConnectedTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  // Load whatever is already saved (including credentials from .env.local) into the form.
  useEffect(() => {
    wallex.getStatus().then((res) => {
      if (!res.ok) {
        if (wallex.available()) setMessage({ kind: 'error', text: res.error });
        return;
      }
      const st = res.data;
      setEnvironment(st.environment);
      setClientId(st.clientId);
      setHasSavedSecret(st.hasSecret);
      setBankId(BANKS.some((b) => b.id === st.bankId) ? st.bankId : BANKS[0].id);
      setProducts(st.products);
      setCountries(st.countries);
      setLanguage(st.language);
      setWebhookUrl(st.webhookUrl);
      setRedirectUri(st.redirectUri);
      setConnectedTo(st.connection?.institutionName ?? null);
    });
  }, []);

  const bank = BANKS.find((b) => b.id === bankId) ?? BANKS[0];
  const hasSecret = secret.trim() !== '' || hasSavedSecret;
  const canConnect = clientId.trim() !== '' && hasSecret && products.length > 0 && countries.length > 0 && !busy;

  async function handleConnect() {
    setBusy(true);
    setMessage(
      environment === 'sandbox'
        ? null
        : { kind: 'info', text: 'Plaid Link opened in a new window. Finish signing in to your bank there.' },
    );
    const res = await wallex.connect({
      settings: { environment, clientId, secret, products, countries, language, webhookUrl, redirectUri },
      bank,
    });
    setBusy(false);

    if (!res.ok) return setMessage({ kind: 'error', text: res.error });
    if (!res.data.connected) return setMessage({ kind: 'info', text: 'Connection cancelled.' });

    if (secret.trim()) setHasSavedSecret(true);
    setSecret('');
    setConnectedTo(res.data.institutionName ?? bank.name);
    setMessage({ kind: 'info', text: 'Connected. Open Transactions to see your activity.' });
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
          <SectionTitle icon="padlock-key">Plaid credentials</SectionTitle>
          <p className="mt-1 font-support text-sm text-muted">
            Find these in your Plaid dashboard under Developers → Keys.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-6 @3xl:grid-cols-2">

          <Field label="Environment" icon="cloud-data-transfer">
            <Select value={environment} onChange={setEnvironment} options={ENVIRONMENTS} />
          </Field>

          <UnderlineField
            label="Client ID"
            icon="user-face-id-mask"
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Your Plaid client ID"
            autoComplete="off"
            spellCheck={false}
          />

          <UnderlineField
            label="Secret"
            icon="padlock-key"
            hint="Use the secret that matches the environment selected above."
            type={showSecret ? 'text' : 'password'}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder={hasSavedSecret ? 'Saved — leave blank to keep it' : 'Your Plaid secret'}
            autoComplete="off"
            spellCheck={false}
            trailing={
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                aria-label={showSecret ? 'Hide secret' : 'Show secret'}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center text-muted hover:text-ink"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
        </div>
      </section>

      <section className="space-y-5 border-t border-line pt-8">
        <div>
          <SectionTitle icon="link-chain">Link options</SectionTitle>
          <p className="mt-1 font-support text-sm text-muted">
            Choose what data to request and which institutions to show.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-6 @3xl:grid-cols-2">

          <Field label="Bank" icon="government-building-1" hint="Plaid Link opens with this bank pre-selected.">
            <Select
              value={bankId}
              onChange={setBankId}
              options={BANKS.map((b) => ({ value: b.id, label: b.name }))}
            />
          </Field>

          <Field label="Language" icon="chat-bubble-text-square">
            <Select value={language} onChange={setLanguage} options={LANGUAGES} />
          </Field>

          <CheckGroup
            legend="Products"
            icon="layers-1"
            options={PRODUCTS}
            selected={products}
            onToggle={(v) => setProducts((p) => toggle(p, v))}
          />
          <CheckGroup
            legend="Countries"
            icon="world"
            options={COUNTRIES}
            selected={countries}
            onToggle={(v) => setCountries((c) => toggle(c, v))}
          />
        </div>
      </section>

      <section className="space-y-5 border-t border-line pt-8">
        <div>
          <SectionTitle icon="code-monitor-2">Advanced (optional)</SectionTitle>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-6 @3xl:grid-cols-2">

          <UnderlineField
            label="Webhook URL"
            icon="lightning-cloud"
            hint="Plaid sends transaction updates here."
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://example.com/plaid/webhook"
          />

          <UnderlineField
            label="Redirect URI"
            icon="share-link"
            hint="Required for Chase and other OAuth banks. Use an HTTPS address allowlisted in your Plaid dashboard; Wallex catches the redirect itself, so nothing has to be hosted there."
            type="url"
            value={redirectUri}
            onChange={(e) => setRedirectUri(e.target.value)}
            placeholder="https://example.com/oauth-return"
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-8">
        <button
          type="submit"
          disabled={!canConnect}
          className="cursor-pointer rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-canvas capitalize transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Connecting…' : connectedTo ? `Reconnect ${bank.name}` : `Connect ${bank.name}`}
        </button>
        {connectedTo && (
          <span className="font-support text-sm text-accent">Connected to {connectedTo}. Unlink it in Account.</span>
        )}
        {message && (
          <span className={`font-support text-sm ${message.kind === 'error' ? 'text-red-400' : 'text-muted'}`}>
            {message.text}
          </span>
        )}
        {!message && !canConnect && !busy && (
          <span className="font-support text-xs text-muted">Enter your client ID and secret to continue.</span>
        )}
      </div>

      <p className="font-support text-xs text-muted">Field icons: Streamline Plump, CC BY 4.0.</p>
    </form>
  );
}
