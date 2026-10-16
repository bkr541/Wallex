import { AnimatePresence, motion } from 'motion/react';
import { Plus, Trash2 } from 'lucide-react';
import SectionTitle from '../components/SectionTitle';
import {
  FIELDS,
  MAX_CONDITIONS,
  OPERATORS,
  PICK_VALUES,
  kindOf,
  setDemo,
  useDemo,
  type Condition,
  type FieldId,
} from '../lib/demo';

// The Demo tab (developer account only): demo mode for showing the app, and the conditions that remove transactions before the app uses them.

const selectClass = 'w-full cursor-pointer rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent';
const inputClass = 'w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted/60 focus:border-accent';

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${on ? 'bg-accent' : 'bg-line'}`}>
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}

const Reveal = ({ children }: { children: React.ReactNode }) => (
  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
    {children}
  </motion.div>
);

function ConditionRow({ c, index, onChange, onRemove }: { c: Condition; index: number; onChange: (patch: Partial<Condition>) => void; onRemove: () => void }) {
  const kind = kindOf(c.field);
  const setField = (field: FieldId) => onChange({ field, op: OPERATORS[kindOf(field)][0].id, value: '' });
  return (
    <li className="grid grid-cols-1 items-center gap-2 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto]">
      <label className="block">
        <span className="sr-only">Condition {index + 1} field</span>
        <select value={c.field} onChange={(e) => setField(e.target.value as FieldId)} className={selectClass}>
          {FIELDS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="sr-only">Condition {index + 1} operator</span>
        <select value={c.op} onChange={(e) => onChange({ op: e.target.value as Condition['op'] })} className={selectClass}>
          {OPERATORS[kind].map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="sr-only">Condition {index + 1} value</span>
        {kind === 'pick' ? (
          <select value={c.value} onChange={(e) => onChange({ value: e.target.value })} className={selectClass}>
            <option value="">Choose…</option>
            {PICK_VALUES[c.field as 'incomeType' | 'status'].map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        ) : (
          <input
            type={kind === 'date' ? 'date' : 'text'}
            inputMode={kind === 'number' ? 'decimal' : undefined}
            value={c.value}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder={kind === 'number' ? '400.00' : kind === 'date' ? '' : 'Value'}
            className={inputClass}
          />
        )}
      </label>
      <button type="button" aria-label={`Remove condition ${index + 1}`} onClick={onRemove} className="flex h-10 w-10 cursor-pointer items-center justify-center justify-self-end rounded-xl text-muted transition-colors hover:bg-surface hover:text-red-300">
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

export default function DemoTab({ suppressedCount = 0 }: { suppressedCount?: number }) {
  const demo = useDemo();
  const add = () => {
    if (demo.conditions.length >= MAX_CONDITIONS) return;
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `c${Date.now()}${demo.conditions.length}`;
    setDemo({ conditions: [...demo.conditions, { id, field: 'merchant', op: 'is', value: '' }] });
  };
  const update = (id: string, patch: Partial<Condition>) => setDemo({ conditions: demo.conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const remove = (id: string) => setDemo({ conditions: demo.conditions.filter((c) => c.id !== id) });

  return (
    <div className="space-y-6 px-0 pb-10 @3xl:px-1">
      <div>
        <SectionTitle icon="eye-optic">Demo</SectionTitle>
        <p className="mt-1 font-support text-sm text-muted">For showing the app to other people. Only this developer account sees this tab.</p>
      </div>

      <section className="rounded-2xl border border-line bg-card/40 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Enabled Demo Mode</p>
            <p className="mt-1.5 font-support text-xs leading-relaxed text-muted">Turns on the demo settings below for this account.</p>
          </div>
          <Switch on={demo.enabled} onChange={(enabled) => setDemo({ enabled })} label="Enabled Demo Mode" />
        </div>

        <AnimatePresence initial={false}>
          {demo.enabled && (
            <Reveal key="suppress">
              <div className="mt-5 border-t border-line pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Suppress Transactions</p>
                    <p className="mt-1.5 font-support text-xs leading-relaxed text-muted">A transaction that meets any condition below is removed before the app uses it. Nothing sees it: not Recurring, Patterns, Forecast, Schedule, Insights or any total.</p>
                  </div>
                  <Switch on={demo.suppress} onChange={(suppress) => setDemo({ suppress })} label="Suppress Transactions" />
                </div>

                <AnimatePresence initial={false}>
                  {demo.suppress && (
                    <Reveal key="conditions">
                      <div className="mt-5 rounded-xl border border-line bg-surface/40 p-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-medium">Suppress a transaction when</p>
                          <p className="font-support text-xs text-muted">{demo.conditions.length} of {MAX_CONDITIONS} conditions</p>
                        </div>

                        {demo.conditions.length === 0 ? (
                          <p className="mt-3 font-support text-sm text-muted">No conditions yet. Nothing is suppressed.</p>
                        ) : (
                          <ul className="mt-4 space-y-3">
                            {demo.conditions.map((c, i) => (
                              <ConditionRow key={c.id} c={c} index={i} onChange={(patch) => update(c.id, patch)} onRemove={() => remove(c.id)} />
                            ))}
                          </ul>
                        )}

                        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                          <button type="button" onClick={add} disabled={demo.conditions.length >= MAX_CONDITIONS} className="flex cursor-pointer items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-medium transition-colors hover:border-muted disabled:cursor-default disabled:opacity-40">
                            <Plus className="h-4 w-4" />
                            Add condition
                          </button>
                          <p className="font-support text-xs text-muted">{suppressedCount} {suppressedCount === 1 ? 'transaction is' : 'transactions are'} suppressed right now.</p>
                        </div>
                        <p className="mt-3 font-support text-xs text-muted">Amount compares the size of the amount, money in or out. Text is not case sensitive. Dates are year-month-day. A condition with an empty value does nothing.</p>
                      </div>
                    </Reveal>
                  )}
                </AnimatePresence>

                <div className="mt-5 flex items-start justify-between gap-4 border-t border-line pt-5">
                  <div>
                    <p className="text-sm font-medium">Hide Amounts</p>
                    <p className="mt-1.5 font-support text-xs leading-relaxed text-muted">Shows the dollar figures in Overview’s Money In, Cash Flow and Money Out group, and on the Patterns circles, as X’s (for example $2,000 shows as X,XXX).</p>
                  </div>
                  <Switch on={demo.hideAmounts} onChange={(hideAmounts) => setDemo({ hideAmounts })} label="Hide Amounts" />
                </div>
              </div>
            </Reveal>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
