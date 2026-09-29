import { FolderTree, Loader2 } from 'lucide-react';
import DirectoryField from '../../components/DirectoryField';
import { useDirectories, useVstLibrary, type VstScanResult } from '../../lib/vst';

const SUBGROUPS = [
  { id: 'projects', label: 'Projects' },
  { id: 'vst', label: 'VST' },
  { id: 'samples', label: 'Samples' },
] as const;

function vstScanStatus(available: boolean, folder: string, result: VstScanResult | null) {
  if (!available) return 'Scanning needs the Downbeat desktop app.';
  if (!folder) return 'Choose a VST directory to scan.';
  if (!result) return 'Not scanned yet.';
  if (result.error) return result.error;
  const n = result.plugins.length;
  const time = new Date(result.scannedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `Found ${n} plugin${n === 1 ? '' : 's'} · scanned ${time}`;
}

export default function SetupTab() {
  const [dirs, setDirs] = useDirectories();
  const vst = useVstLibrary(dirs.vst ?? '', { autoScan: false });
  const vstFolder = (dirs.vst ?? '').trim();

  return (
    <section
      aria-labelledby="directories-heading"
      className="mt-6 w-full overflow-hidden rounded-[15px] border border-line"
    >
      <h2
        id="directories-heading"
        className="flex h-14 items-center gap-3 border-b border-line px-4 text-[16px] font-[650] tracking-tight text-ink"
      >
        <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-accent-soft text-accent">
          <FolderTree className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </span>
        Directories
      </h2>

      <div className="grid gap-5 py-4 pr-4 pl-[60px]">
        {SUBGROUPS.map((g) => (
          <div key={g.id}>
            <div className="mb-2.5 flex items-center gap-2.5 text-[13px] font-[540] text-ink">
              <i className="h-[9px] w-[9px] rounded-[3px] bg-accent shadow-[0_0_0_4px_var(--accent-soft)]" />
              {g.label}
            </div>
            <div className="border-l border-white/[0.06] pl-4">
              <DirectoryField
                label={g.label}
                value={dirs[g.id] ?? ''}
                onChange={(path) => setDirs((d) => ({ ...d, [g.id]: path }))}
              />
              {g.id === 'vst' && (
                <div className="mt-2.5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={vst.rescan}
                    disabled={!vst.available || !vstFolder || vst.scanning}
                    className="flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-[11px] border border-white/[0.06] bg-[#2c2e31] px-4 text-[13px] font-[560] text-[#e9e9e8] transition hover:bg-[#34363a] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {vst.scanning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {vst.scanning ? 'Scanning…' : 'Rescan'}
                  </button>
                  <span className={`text-[12px] ${vst.result?.error ? 'text-danger' : 'text-ink-3'}`} role="status">
                    {vstScanStatus(vst.available, vstFolder, vst.result)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
