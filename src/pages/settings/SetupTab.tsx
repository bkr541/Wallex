import { AudioWaveform, FolderTree, Loader2 } from 'lucide-react';
import DirectoryList from '../../components/DirectoryList';
import SelectField from '../../components/SelectField';
import { usePersistentState } from '../../lib/usePersistentState';
import SettingsGroup from './SettingsGroup';
import { MULTIPLE_DIRECTORIES, useDirectories, useVstLibrary, type VstScanResult } from '../../lib/vst';

const DAWS = [
  'Ableton Live',
  'FL Studio',
  'Logic Pro',
  'Pro Tools',
  'Cubase',
  'Studio One',
  'Reason',
  'Bitwig Studio',
  'Reaper',
  'GarageBand',
] as const;

const SUBGROUPS = [
  { id: 'projects', label: 'Projects' },
  { id: 'vst', label: 'VST' },
  { id: 'samples', label: 'Samples' },
] as const;

function vstScanStatus(available: boolean, hasFolders: boolean, result: VstScanResult | null) {
  if (!available) return 'Scanning needs the Downbeat desktop app.';
  if (!hasFolders) return 'Add a VST directory to scan.';
  if (!result) return 'Not scanned yet.';
  if (result.error) return result.error;
  const n = result.plugins.length;
  const time = new Date(result.scannedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `Found ${n} plugin${n === 1 ? '' : 's'} · scanned ${time}`;
}

export default function SetupTab() {
  const [dirs, setDirs] = useDirectories();
  const vstFolders = dirs.vst ?? [];
  const vst = useVstLibrary(vstFolders, { autoScan: false });
  const [daw, setDaw] = usePersistentState<string>('downbeat.daw', '');

  return (
    <div className="mt-6 grid gap-6">
      <SettingsGroup id="daw-heading" title="DAW" icon={AudioWaveform}>
        <SelectField label="DAW" value={daw} options={DAWS} placeholder="Select your DAW" onChange={setDaw} />
      </SettingsGroup>

      <SettingsGroup id="directories-heading" title="Directories" icon={FolderTree}>
        {SUBGROUPS.map((g) => (
          <div key={g.id}>
            <div className="mb-2.5 flex items-center gap-2.5 text-[13px] font-[540] text-ink">
              <i className="h-[9px] w-[9px] rounded-[3px] bg-accent shadow-[0_0_0_4px_var(--accent-soft)]" />
              {g.label}
            </div>
            <div className="border-l border-white/[0.06] pl-4">
              <DirectoryList
                label={g.label}
                folders={dirs[g.id] ?? []}
                multiple={MULTIPLE_DIRECTORIES}
                onChange={(folders) => setDirs((d) => ({ ...d, [g.id]: folders }))}
              />
              {g.id === 'vst' && (
                <div className="mt-2.5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={vst.rescan}
                    disabled={!vst.available || vstFolders.length === 0 || vst.scanning}
                    className="flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-[11px] border border-white/[0.06] bg-[#2c2e31] px-4 text-[13px] font-[560] text-[#e9e9e8] transition hover:bg-[#34363a] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {vst.scanning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {vst.scanning ? 'Scanning…' : 'Rescan'}
                  </button>
                  <span className={`text-[12px] ${vst.result?.error ? 'text-danger' : 'text-ink-3'}`} role="status">
                    {vstScanStatus(vst.available, vstFolders.length > 0, vst.result)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </SettingsGroup>
    </div>
  );
}
