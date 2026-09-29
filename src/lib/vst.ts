import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePersistentState } from './usePersistentState';

export type VstFormat = 'VST2' | 'VST3';

export interface VstPlugin {
  id: string;
  name: string;
  vendor: string | null;
  version: string | null;
  formats: { format: VstFormat; path: string; version: string | null }[];
}

export interface VstScanResult {
  folders: string[];
  scannedAt: string;
  durationMs?: number;
  plugins: VstPlugin[];
  warnings: string[];
  error?: string;
}

// Directory settings from the Setup tab: setting id ({ projects, vst, samples }) -> list of paths.
// Older saves stored a single path string per setting; those are upgraded to a one-item list.
type DirectoryMap = Record<string, string[]>;

// Each directory setting currently holds one folder. Flip this to bring back the multi-folder list UI
// (DirectoryList's `multiple` mode); the scanner and storage already handle several folders.
export const MULTIPLE_DIRECTORIES = false;

function normalizeDirectories(raw: Record<string, string | string[]>): DirectoryMap {
  const out: DirectoryMap = {};
  for (const [key, value] of Object.entries(raw)) {
    const list = Array.isArray(value) ? value : value ? [value] : [];
    const valid = list.filter((p) => typeof p === 'string' && p.trim());
    out[key] = MULTIPLE_DIRECTORIES ? valid : valid.slice(0, 1);
  }
  return out;
}

export function useDirectories() {
  const [raw, setRaw] = usePersistentState<Record<string, string | string[]>>('downbeat.directories', {});
  const dirs = useMemo(() => normalizeDirectories(raw), [raw]);
  const setDirs = useCallback(
    (update: (current: DirectoryMap) => DirectoryMap) => setRaw((r) => update(normalizeDirectories(r))),
    [setRaw],
  );
  return [dirs, setDirs] as const;
}

// Local VST library for `folders`. Shows the cached scan straight away; optionally rescans on mount.
// Scanning only exists in the Electron app (the main process reads the disk), so `available` is false in a browser.
export function useVstLibrary(folders: string[], { autoScan }: { autoScan: boolean }) {
  const available = !!window.downbeat?.scanVstFolder;
  const key = JSON.stringify(folders);
  const [result, setResult] = useState<VstScanResult | null>(null);
  const [scanning, setScanning] = useState(false);

  const rescan = useCallback(async () => {
    const list: string[] = JSON.parse(key);
    if (!available || list.length === 0) return;
    setScanning(true);
    try {
      setResult(await window.downbeat!.scanVstFolder(list));
    } catch (err) {
      setResult({ folders: list, scannedAt: new Date().toISOString(), plugins: [], warnings: [], error: String(err) });
    } finally {
      setScanning(false);
    }
  }, [available, key]);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    if (!available || JSON.parse(key).length === 0) return;

    (async () => {
      const cached = await window.downbeat!.getVstCache().catch(() => null);
      if (!cancelled && cached && JSON.stringify(cached.folders) === key) setResult(cached);
      if (!cancelled && autoScan) await rescan();
    })();

    return () => {
      cancelled = true;
    };
  }, [available, key, autoScan, rescan]);

  return { result, scanning, available, rescan };
}
