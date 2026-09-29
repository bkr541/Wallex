import { FolderOpen } from 'lucide-react';
import { pickDirectory } from '../lib/pickDirectory';

interface DirectoryFieldProps {
  label: string;
  value: string;
  onChange: (path: string) => void;
}

// Text field for a directory path with a Browse button that opens the native folder picker.
export default function DirectoryField({ label, value, onChange }: DirectoryFieldProps) {
  const browse = async () => {
    const picked = await pickDirectory(value);
    if (picked) onChange(picked);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <FolderOpen className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-3" strokeWidth={1.8} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="No directory selected"
          aria-label={`${label} directory`}
          spellCheck={false}
          className="h-10 w-full rounded-[11px] border border-line-strong bg-[#222326] pr-3 pl-10 text-[13px] text-ink outline-none transition placeholder:text-[#6f7175] focus:border-accent/55 focus:bg-[#25272a] focus:shadow-[0_0_0_3px_rgba(92,230,209,0.08)]"
        />
      </div>
      <button
        type="button"
        onClick={browse}
        className="h-10 shrink-0 cursor-pointer rounded-[11px] border border-white/[0.06] bg-[#2c2e31] px-4 text-[13px] font-[560] text-[#e9e9e8] transition hover:bg-[#34363a]"
      >
        Browse…
      </button>
    </div>
  );
}
