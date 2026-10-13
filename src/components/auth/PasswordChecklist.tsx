import { Check, Circle } from 'lucide-react';
import { PASSWORD_RULES } from '../../lib/passwordRules';

// The password rules as a live checklist: each line lights up as the password meets it.
export default function PasswordChecklist({ value, className = '' }: { value: string; className?: string }) {
  return (
    <ul className={`grid grid-cols-1 gap-x-4 gap-y-1 font-support text-xs @xl:grid-cols-2 ${className}`} aria-label="Password requirements">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(value);
        return (
          <li key={r.id} className={`flex items-center gap-2 transition-colors ${ok ? 'text-accent' : 'text-muted'}`}>
            {ok ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <Circle className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />}
            <span>{r.label}</span>
            <span className="sr-only">{ok ? 'met' : 'not met yet'}</span>
          </li>
        );
      })}
    </ul>
  );
}
