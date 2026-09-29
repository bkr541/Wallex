import { useState } from 'react';
import { FolderOpen, Trash2 } from 'lucide-react';
import { pickDirectory } from '../lib/pickDirectory';

const INPUT_CLASS =
  'h-10 w-full rounded-[11px] border border-line-strong bg-[#222326] pr-3 pl-10 text-[13px] text-ink outline-none transition placeholder:text-[#6f7175] focus:border-accent/55 focus:bg-[#25272a] focus:shadow-[0_0_0_3px_rgba(92,230,209,0.08)]';
const BUTTON_CLASS =
  'h-10 shrink-0 cursor-pointer rounded-[11px] border border-white/[0.06] bg-[#2c2e31] px-4 text-[13px] font-[560] text-[#e9e9e8] transition hover:bg-[#34363a] disabled:cursor-not-allowed disabled:opacity-50';

interface DirectoryListProps {
  label: string;
  folders: string[];
  onChange: (folders: string[]) => void;
  // Several folders (list + Add) or just one (plain field + Browse).
  multiple: boolean;
}

// A list of configured directories with a field to add more (type a path + Add/Enter, or Browse…).
export default function DirectoryList({ label, folders, onChange, multiple }: DirectoryListProps) {
  const [draft, setDraft] = useState('');

  const add = (path: string) => {
    const p = path.trim();
    if (p && !folders.includes(p)) onChange([...folders, p]);
  };

  const commitDraft = () => {
    add(draft);
    setDraft('');
  };

  const browse = async () => {
    const picked = await pickDirectory(folders[folders.length - 1]);
    if (picked) (multiple ? add(picked) : onChange([picked]));
  };

  if (!multiple) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <FolderOpen className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-3" strokeWidth={1.8} />
          <input
            type="text"
            value={folders[0] ?? ''}
            onChange={(e) => onChange(e.target.value ? [e.target.value] : [])}
            placeholder="No directory selected"
            aria-label={`${label} directory`}
            spellCheck={false}
            className={INPUT_CLASS}
          />
        </div>
        <button type="button" onClick={browse} className={BUTTON_CLASS}>
          Browse…
        </button>
      </div>
    );
  }

  return (
    <div>
      {folders.length > 0 && (
        <div className="mb-3">
          <div className="border-b border-line pb-2 text-[11px] font-semibold tracking-wider text-ink-3 uppercase">
            Configured folders ({folders.length})
          </div>
          <ul>
            {folders.map((f) => (
              <li key={f} className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0">
                <FolderOpen className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.8} />
                <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink" title={f}>
                  {f}
                </span>
                <button
                  type="button"
                  onClick={() => onChange(folders.filter((x) => x !== f))}
                  aria-label={`Remove ${f}`}
                  className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-danger/80 transition hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <FolderOpen className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-3" strokeWidth={1.8} />
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitDraft()}
            placeholder={folders.length ? 'Add another directory' : 'No directory selected'}
            aria-label={`${label} directory`}
            spellCheck={false}
            className="h-10 w-full rounded-[11px] border border-line-strong bg-[#222326] pr-3 pl-10 text-[13px] text-ink outline-none transition placeholder:text-[#6f7175] focus:border-accent/55 focus:bg-[#25272a] focus:shadow-[0_0_0_3px_rgba(92,230,209,0.08)]"
          />
        </div>
        <button
          type="button"
          onClick={commitDraft}
          disabled={!draft.trim()}
          title={draft.trim() ? undefined : 'Type a path to add it, or use Browse…'}
          className="h-10 shrink-0 cursor-pointer rounded-[11px] border border-white/[0.06] bg-[#2c2e31] px-4 text-[13px] font-[560] text-[#e9e9e8] transition hover:bg-[#34363a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add
        </button>
        <button
          type="button"
          onClick={browse}
          className="h-10 shrink-0 cursor-pointer rounded-[11px] border border-white/[0.06] bg-[#2c2e31] px-4 text-[13px] font-[560] text-[#e9e9e8] transition hover:bg-[#34363a]"
        >
          Browse…
        </button>
      </div>
    </div>
  );
}
