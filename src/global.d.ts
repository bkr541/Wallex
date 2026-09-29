import type { VstScanResult } from './lib/vst';

export {};

declare global {
  interface Window {
    // Exposed by electron/preload.cjs; undefined when running in a plain browser.
    downbeat?: {
      platform: string;
      selectDirectory: (defaultPath?: string) => Promise<string | null>;
      scanVstFolder: (folder: string) => Promise<VstScanResult>;
      getVstCache: () => Promise<VstScanResult | null>;
    };
    // File System Access API (Chromium); only used as a browser fallback.
    showDirectoryPicker?: () => Promise<{ name: string }>;
  }
}
