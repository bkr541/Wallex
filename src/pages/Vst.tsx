import { useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useDirectories, useVstLibrary, type VstPlugin } from '../lib/vst';

const FORMAT_STYLES: Record<string, string> = {
  VST3: 'bg-accent-soft text-accent',
  VST2: 'bg-[#2c2e31] text-[#b7b8ba]',
};

function Message({ children }: { children: React.ReactNode }) {
  return <p className="mt-10 text-[13px] text-ink-3">{children}</p>;
}

function matches(p: VstPlugin, q: string) {
  return (
    p.name.toLowerCase().includes(q) ||
    (p.vendor ?? '').toLowerCase().includes(q) ||
    p.formats.some((f) => f.format.toLowerCase().includes(q))
  );
}

export default function Vst() {
  const [dirs] = useDirectories();
  const folder = dirs.vst ?? '';
  const { result, scanning, available } = useVstLibrary(folder, { autoScan: true });
  const [query, setQuery] = useState('');

  const plugins = result?.plugins ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? plugins.filter((p) => matches(p, q)) : plugins;
  }, [plugins, query]);

  let body: React.ReactNode;
  if (!available) {
    body = <Message>Scanning plugins needs the Downbeat desktop app.</Message>;
  } else if (!folder.trim()) {
    body = <Message>No VST directory set. Choose one under Settings → Setup → Directories.</Message>;
  } else if (!result) {
    body = <Message>{scanning ? 'Scanning your VST directory…' : ''}</Message>;
  } else if (result.error) {
    body = <Message>{result.error}</Message>;
  } else if (plugins.length === 0) {
    body = <Message>No VST plugins found in {folder}.</Message>;
  } else {
    body = (
      <>
        <div className="mt-6 flex items-center gap-4">
          <div className="relative w-full max-w-[380px]">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-3" strokeWidth={1.8} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search plugins"
              aria-label="Search plugins"
              className="h-10 w-full rounded-[11px] border border-line-strong bg-[#222326] pr-3 pl-10 text-[13px] text-ink outline-none transition placeholder:text-[#6f7175] focus:border-accent/55 focus:bg-[#25272a] focus:shadow-[0_0_0_3px_rgba(92,230,209,0.08)]"
            />
          </div>
          <span className="text-[13px] text-ink-3">
            {query.trim() ? `${filtered.length} of ${plugins.length}` : plugins.length} plugins
          </span>
        </div>

        <div className="mt-4 overflow-hidden rounded-[15px] border border-line">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="bg-[#222326] text-[11px] tracking-wider text-ink-3 uppercase">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Vendor</th>
                <th className="px-4 py-3 font-semibold">Formats</th>
                <th className="px-4 py-3 text-right font-semibold">Version</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-line transition-colors hover:bg-white/[0.02]">
                  <td className="max-w-0 truncate px-4 py-3 font-[540] text-ink" title={p.formats[0]?.path}>
                    {p.name}
                  </td>
                  <td className="px-4 py-3 text-ink-2">{p.vendor ?? <span className="text-ink-3">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className="flex gap-1.5">
                      {p.formats.map((f) => (
                        <span key={f.format} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${FORMAT_STYLES[f.format]}`}>
                          {f.format}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-ink-2 tabular-nums">{p.version ?? '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr className="border-t border-line">
                  <td colSpan={4} className="px-4 py-8 text-center text-ink-3">
                    No plugins match “{query}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <div className="w-full">
      <PageHeader>VST</PageHeader>
      {result && !result.error && (
        <p className="mt-2 flex items-center gap-2 text-[12px] text-ink-3">
          <span className="truncate">{result.folder}</span>
          <span>·</span>
          <span className="shrink-0">
            {scanning ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" /> Rescanning…
              </span>
            ) : (
              `Scanned ${new Date(result.scannedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
            )}
          </span>
        </p>
      )}
      {body}
    </div>
  );
}
