import React, { useState } from 'react';
import { ChevronDown, Eye, EyeOff } from 'lucide-react';

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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
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
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">{legend}</legend>
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
              className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition-colors ${
                on ? 'border-accent bg-accent-soft text-ink' : 'border-line bg-surface text-muted hover:text-ink'
              }`}
            >
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

export default function SetupTab() {
  const [environment, setEnvironment] = useState('sandbox');
  const [clientId, setClientId] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [products, setProducts] = useState<string[]>(['transactions']);
  const [countries, setCountries] = useState<string[]>(['US']);
  const [language, setLanguage] = useState('en');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [redirectUri, setRedirectUri] = useState('');

  const canConnect = clientId.trim() !== '' && secret.trim() !== '' && products.length > 0 && countries.length > 0;

  return (
    <form
      className="w-full space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <section className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold">Plaid credentials</h2>
          <p className="mt-1 font-support text-sm text-muted">
            Find these in your Plaid dashboard under Developers → Keys.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">

          <Field label="Environment">
            <Select value={environment} onChange={setEnvironment} options={ENVIRONMENTS} />
          </Field>

          <Field label="Client ID">
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Your Plaid client ID"
              autoComplete="off"
              spellCheck={false}
              className={inputClass}
            />
          </Field>

          <Field label="Secret" hint="Use the secret that matches the environment selected above.">
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Your Plaid secret"
                autoComplete="off"
                spellCheck={false}
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                aria-label={showSecret ? 'Hide secret' : 'Show secret'}
                className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center text-muted hover:text-ink"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
        </div>
      </section>

      <section className="space-y-5 border-t border-line pt-8">
        <div>
          <h2 className="text-lg font-semibold">Link options</h2>
          <p className="mt-1 font-support text-sm text-muted">
            Choose what data to request and which institutions to show.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">

          <CheckGroup
            legend="Products"
            options={PRODUCTS}
            selected={products}
            onToggle={(v) => setProducts((p) => toggle(p, v))}
          />
          <CheckGroup
            legend="Countries"
            options={COUNTRIES}
            selected={countries}
            onToggle={(v) => setCountries((c) => toggle(c, v))}
          />

          <Field label="Language">
            <Select value={language} onChange={setLanguage} options={LANGUAGES} />
          </Field>
        </div>
      </section>

      <section className="space-y-5 border-t border-line pt-8">
        <div>
          <h2 className="text-lg font-semibold">Advanced (optional)</h2>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">

          <Field label="Webhook URL" hint="Plaid sends transaction updates here.">
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://example.com/plaid/webhook"
              className={inputClass}
            />
          </Field>

          <Field label="Redirect URI" hint="Required for OAuth banks. Must be allowlisted in your Plaid dashboard.">
            <input
              type="url"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
              placeholder="https://example.com/oauth-return"
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <div className="flex items-center gap-4 border-t border-line pt-8">
        <button
          type="submit"
          disabled={!canConnect}
          className="cursor-pointer rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-canvas transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          Connect account
        </button>
        {!canConnect && (
          <span className="font-support text-xs text-muted">Enter your client ID and secret to continue.</span>
        )}
      </div>
    </form>
  );
}
