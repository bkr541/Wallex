import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, Search } from 'lucide-react';
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

type SortKey = 'name' | 'vendor' | 'formats' | 'version';
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string; className: string }[] = [
  { key: 'name', label: 'Name', className: '' },
  { key: 'vendor', label: 'Vendor', className: 'w-[22%]' },
  { key: 'formats', label: 'Formats', className: 'w-[170px]' },
  { key: 'version', label: 'Version', className: 'w-[130px] text-right' },
];

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function sortValue(p: VstPlugin, key: SortKey): string | null {
  switch (key) {
    case 'name':
      return p.name;
    case 'vendor':
      return p.vendor;
    case 'formats':
      return p.formats.map((f) => f.format).join(' ');
    case 'version':
      return p.version;
  }
}

export default function Vst() {
  const [dirs] = useDirectories();
  const folders = dirs.vst ?? [];
  const { result, scanning, available } = useVstLibrary(folders, { autoScan: true });
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'name', dir: 'asc' });

  const plugins = result?.plugins ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? plugins.filter((p) => matches(p, q)) : [...plugins];
    const sign = sort.dir === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      if (av === null || bv === null) return av === bv ? 0 : av === null ? 1 : -1; // empty values always last
      return sign * collator.compare(av, bv) || collator.compare(a.name, b.name);
    });
  }, [plugins, query, sort]);

  // Double-click a column header to sort by it; double-click the sorted column to flip the direction.
  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  let body: React.ReactNode;
  if (!available) {
    body = <Message>Scanning plugins needs the Downbeat desktop app.</Message>;
  } else if (folders.length === 0) {
    body = <Message>No VST directory set. Choose one under Settings → Setup → Directories.</Message>;
  } else if (!result) {
    body = <Message>{scanning ? 'Scanning your VST directory…' : ''}</Message>;
  } else if (result.error) {
    body = <Message>{result.error}</Message>;
  } else if (plugins.length === 0) {
    body = <Message>No VST plugins found in your VST {folders.length === 1 ? 'directory' : 'directories'}.</Message>;
  } else {
    body = (
      <>
        <div className="mt-6 flex shrink-0 items-center gap-4">
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
          {scanning && <Loader2 className="h-4 w-4 animate-spin text-ink-3" aria-label="Rescanning" />}
        </div>

        {/* Only this box scrolls; the header row stays put. */}
        <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-[15px] border border-line">
          <div className="h-full overflow-y-auto">
            <table className="w-full table-fixed text-left text-[13px]">
              <thead>
                <tr className="text-[11px] tracking-wider text-ink-3 uppercase">
                  {COLUMNS.map((c) => {
                    const active = sort.key === c.key;
                    return (
                      <th
                        key={c.key}
                        scope="col"
                        aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        title="Double-click to sort"
                        onDoubleClick={() => toggleSort(c.key)}
                        className={`sticky top-0 z-10 cursor-pointer bg-[#222326] px-4 py-3 font-semibold select-none ${c.className} ${active ? 'text-ink' : ''}`}
                      >
                        <span className={`inline-flex items-center gap-1.5 ${c.className.includes('text-right') ? 'flex-row-reverse' : ''}`}>
                          {c.label}
                          {active && (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t border-line transition-colors hover:bg-white/[0.02]">
                    <td className="truncate px-4 py-3 font-[540] text-ink" title={p.formats[0]?.path}>
                      {p.name}
                    </td>
                    <td className="truncate px-4 py-3 text-ink-2">{p.vendor ?? <span className="text-ink-3">—</span>}</td>
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
        </div>
      </>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <PageHeader>VST</PageHeader>
      {body}
    </div>
  );
}
