import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Plus } from 'lucide-react';
import { addGoal, canAddGoal, removeGoal, updateGoal, useGoals, type Goal } from '../lib/goals';
import { money, percentText } from '../lib/patternFormat';

// The Goals tab: what the person is saving toward. They enter the amounts themselves; nothing here reads a bank account, so
// it works whether or not a bank is linked.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};


const parseAmount = (v: string) => {
  const n = Number(v.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : NaN;
};

function GoalForm({ goal, onDone }: { goal?: Goal; onDone: () => void }) {
  const [name, setName] = useState(goal?.name ?? '');
  const [target, setTarget] = useState(goal ? String(goal.target) : '');
  const [saved, setSaved] = useState(goal ? String(goal.saved) : '');
  const [monthly, setMonthly] = useState(goal?.monthly ? String(goal.monthly) : '');
  const [error, setError] = useState('');
  const input = 'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-muted/60 focus:border-accent';
  const label = 'mb-1 block font-support text-[11px] font-semibold tracking-[0.15em] text-muted uppercase';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = parseAmount(target);
    const s = saved.trim() ? parseAmount(saved) : 0;
    const m = monthly.trim() ? parseAmount(monthly) : null;
    if (!name.trim()) return setError('Give the goal a name.');
    if (!(t > 0)) return setError('Enter the amount you want to reach.');
    if (!(s >= 0)) return setError('Saved so far must be zero or more.');
    if (m !== null && !(m > 0)) return setError('Monthly amount must be more than zero, or left empty.');
    if (goal) updateGoal(goal.id, { name: name.trim(), target: t, saved: s, monthly: m });
    else addGoal({ name: name.trim(), target: t, saved: s, monthly: m });
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-line bg-surface/40 p-4">
      <div>
        <label className={label} htmlFor="goal-name">Goal</label>
        <input id="goal-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Emergency fund" className={input} autoFocus />
      </div>
      <div className="grid grid-cols-1 gap-3 @xl:grid-cols-3">
        <div>
          <label className={label} htmlFor="goal-target">Amount to reach</label>
          <input id="goal-target" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="15,000" className={input} />
        </div>
        <div>
          <label className={label} htmlFor="goal-saved">Saved so far</label>
          <input id="goal-saved" inputMode="decimal" value={saved} onChange={(e) => setSaved(e.target.value)} placeholder="0" className={input} />
        </div>
        <div>
          <label className={label} htmlFor="goal-monthly">Set aside each month</label>
          <input id="goal-monthly" inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} placeholder="Optional" className={input} />
        </div>
      </div>
      {error && <p role="alert" className="font-support text-xs text-red-300">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" className="cursor-pointer rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-canvas">{goal ? 'Save Changes' : 'Add Goal'}</button>
        <button type="button" onClick={onDone} className="cursor-pointer rounded-xl px-3 py-2 text-sm text-muted hover:text-ink">Cancel</button>
      </div>
    </form>
  );
}

function eta(goal: Goal, today: string): string | null {
  const left = goal.target - goal.saved;
  if (left <= 0 || !goal.monthly) return null;
  const months = Math.ceil(left / goal.monthly);
  const [y, m] = today.split('-').map(Number);
  const idx = y * 12 + (m - 1) + months;
  return `At ${money(goal.monthly)} a month, on track for ${MONTHS[idx % 12]} ${Math.floor(idx / 12)}.`;
}

function GoalCard({ goal, today }: { goal: Goal; today: string }) {
  const [mode, setMode] = useState<'view' | 'add' | 'edit' | 'remove'>('view');
  const [amount, setAmount] = useState('');
  const share = Math.min(1, goal.saved / goal.target);
  const done = goal.saved >= goal.target;
  const text = eta(goal, today);

  if (mode === 'edit') return <GoalForm goal={goal} onDone={() => setMode('view')} />;

  return (
    <div className="rounded-2xl border border-line bg-surface/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{goal.name}</p>
          <p className="mt-0.5 font-support text-sm text-muted tabular-nums">{money(goal.saved)} of {money(goal.target)}</p>
        </div>
        <p className={`text-lg font-semibold tabular-nums ${done ? 'text-accent' : ''}`}>{done ? <Check className="inline h-5 w-5" aria-label="Reached" /> : percentText(share)}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)} aria-label={`${goal.name} progress`}>
        <motion.div className="h-full rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: `${share * 100}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      <p className="mt-2 min-h-4 font-support text-xs text-muted">{done ? 'Goal reached.' : text ?? `${money(goal.target - goal.saved)} to go.`}</p>

      {mode === 'add' ? (
        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const n = parseAmount(amount);
            if (n > 0) updateGoal(goal.id, { saved: goal.saved + n });
            setAmount('');
            setMode('view');
          }}
        >
          <input autoFocus inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount to add" aria-label="Amount to add" className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted/60 focus:border-accent" />
          <button type="submit" className="cursor-pointer rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-canvas">Add</button>
          <button type="button" onClick={() => setMode('view')} className="cursor-pointer px-2 py-2 text-sm text-muted hover:text-ink">Cancel</button>
        </form>
      ) : mode === 'remove' ? (
        <div className="mt-3 flex items-center gap-3 font-support text-sm">
          <span className="text-muted">Remove this goal?</span>
          <button type="button" onClick={() => removeGoal(goal.id)} className="cursor-pointer font-semibold text-red-300 hover:underline">Remove</button>
          <button type="button" onClick={() => setMode('view')} className="cursor-pointer text-muted hover:text-ink">Keep</button>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-4 font-support text-sm">
          <button type="button" onClick={() => setMode('add')} className="cursor-pointer font-medium text-accent hover:underline">Add money</button>
          <button type="button" onClick={() => setMode('edit')} className="cursor-pointer text-muted hover:text-ink">Edit</button>
          <button type="button" onClick={() => setMode('remove')} className="cursor-pointer text-muted hover:text-ink">Remove</button>
        </div>
      )}
    </div>
  );
}

export default function GoalsTab() {
  const today = localToday();
  const goals = useGoals();
  const [adding, setAdding] = useState(false);
  return (
    <div className="px-1 pb-10">
      <p className="font-support text-sm text-muted">What you are saving toward. You enter the amounts yourself; Wallex does not move money.</p>
      <div className="mt-4 grid grid-cols-1 gap-3 @3xl:grid-cols-2">
        {goals.map((g) => <GoalCard key={g.id} goal={g} today={today} />)}
        {adding ? (
          <div className="@3xl:col-span-2"><GoalForm onDone={() => setAdding(false)} /></div>
        ) : (
          canAddGoal() && (
            <button type="button" onClick={() => setAdding(true)} className="flex min-h-[5.5rem] cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line font-support text-sm text-muted transition-colors hover:border-muted hover:text-ink">
              <Plus className="h-4 w-4" />
              Add a new goal
            </button>
          )
        )}
      </div>
    </div>
  );
}
