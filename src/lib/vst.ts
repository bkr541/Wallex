import { useCallback, useEffect, useState } from 'react';
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
  folder: string;
  scannedAt: string;
  durationMs?: number;
  plugins: VstPlugin[];
  warnings: string[];
  error?: string;
}

// Directory settings from the Setup tab ({ projects, vst, samples } -> path).
export function useDirectories() {
  return usePersistentState<Record<string, string>>('downbeat.directories', {});
}

// Local VST library for `folder`. Shows the cached scan straight away; optionally rescans on mount.
// Scanning only exists in the Electron app (the main process reads the disk), so `available` is false in a browser.
export function useVstLibrary(folder: string, { autoScan }: { autoScan: boolean }) {
  const available = !!window.downbeat?.scanVstFolder;
  const [result, setResult] = useState<VstScanResult | null>(null);
  const [scanning, setScanning] = useState(false);

  const rescan = useCallback(async () => {
    if (!available || !folder.trim()) return;
    setScanning(true);
    try {
      setResult(await window.downbeat!.scanVstFolder(folder));
    } catch (err) {
      setResult({ folder, scannedAt: new Date().toISOString(), plugins: [], warnings: [], error: String(err) });
    } finally {
      setScanning(false);
    }
  }, [available, folder]);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    if (!available || !folder.trim()) return;

    (async () => {
      const cached = await window.downbeat!.getVstCache().catch(() => null);
      if (!cancelled && cached && cached.folder === folder) setResult(cached);
      if (!cancelled && autoScan) await rescan();
    })();

    return () => {
      cancelled = true;
    };
  }, [available, folder, autoScan, rescan]);

  return { result, scanning, available, rescan };
}
