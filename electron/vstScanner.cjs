// Local VST scanner: walks a directory for VST2 (.vst) and VST3 (.vst3) plugins and merges the
// same plugin across formats into one entry. Runs in the Electron main process; no network involved.
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const FORMATS = { '.vst': 'VST2', '.vst3': 'VST3' };
const FORMAT_ORDER = ['VST2', 'VST3'];
const CONCURRENCY = 8;

const decodeXml = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

// Binary plists (rare, but they exist) can't be regex-parsed; macOS's plutil converts them to JSON.
function plutilJson(plistPath) {
  return new Promise((resolve) => {
    execFile('plutil', ['-convert', 'json', '-o', '-', plistPath], { maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => {
      if (err) return resolve(null);
      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve(null);
      }
    });
  });
}

async function readBundleInfo(bundlePath) {
  const plistPath = path.join(bundlePath, 'Contents', 'Info.plist');
  let raw;
  try {
    raw = await fs.promises.readFile(plistPath);
  } catch {
    return {};
  }

  let get;
  if (raw.subarray(0, 6).toString('latin1') === 'bplist') {
    const json = await plutilJson(plistPath);
    get = (key) => (typeof json?.[key] === 'string' ? json[key].trim() || undefined : undefined);
  } else {
    const text = raw.toString('utf8');
    get = (key) => {
      const m = text.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`));
      return m ? decodeXml(m[1]).trim() || undefined : undefined;
    };
  }

  return {
    version: get('CFBundleShortVersionString') || get('CFBundleVersion') || null,
    vendor: get('CFBundleManufacturer') || null,
  };
}

// Finds plugin bundles/files under `root`. Never descends into a plugin bundle.
async function findPlugins(root, warnings) {
  const found = [];
  const visited = new Set();

  async function walk(dir) {
    let real;
    try {
      real = await fs.promises.realpath(dir);
    } catch (err) {
      warnings.push(`Cannot read ${dir}: ${err.message}`);
      return;
    }
    if (visited.has(real)) return; // symlink loop
    visited.add(real);

    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch (err) {
      warnings.push(`Cannot read ${dir}: ${err.message}`);
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      const format = FORMATS[path.extname(entry.name).toLowerCase()];

      if (format) {
        found.push({ full, format });
        continue;
      }

      let isDir = entry.isDirectory();
      if (entry.isSymbolicLink()) {
        try {
          isDir = (await fs.promises.stat(full)).isDirectory();
        } catch {
          continue; // broken link
        }
      }
      if (isDir) await walk(full);
    }
  }

  await walk(root);
  return found;
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    }),
  );
  return results;
}

const normalize = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '');

// Scans every folder in `folders` and merges the results into one plugin list.
async function scanVstFolders(folders) {
  const started = Date.now();
  const warnings = [];
  const base = { folders, scannedAt: new Date().toISOString(), plugins: [], warnings };

  const found = [];
  const seenPaths = new Set();
  let scannable = 0;
  for (const folder of folders) {
    let stat;
    try {
      stat = await fs.promises.stat(folder);
    } catch {
      warnings.push(`Directory not found: ${folder}`);
      continue;
    }
    if (!stat.isDirectory()) {
      warnings.push(`Not a directory: ${folder}`);
      continue;
    }
    scannable++;
    for (const item of await findPlugins(folder, warnings)) {
      if (seenPaths.has(item.full)) continue; // overlapping folders
      seenPaths.add(item.full);
      found.push(item);
    }
  }
  if (scannable === 0) return { ...base, error: warnings[0] || 'No VST directories set' };

  const entries = await mapLimit(found, CONCURRENCY, async ({ full, format }) => {
    const ext = path.extname(full);
    const info = await readBundleInfo(full);
    return {
      name: path.basename(full, ext),
      format,
      path: full,
      version: info.version ?? null,
      vendor: info.vendor ?? null,
    };
  });

  // Merge the same plugin across formats (Serum.vst + Serum.vst3 -> one row).
  const groups = new Map();
  for (const e of entries) {
    const key = normalize(e.name) || e.name.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }

  const plugins = [...groups.entries()].map(([id, group]) => {
    group.sort((a, b) => FORMAT_ORDER.indexOf(a.format) - FORMAT_ORDER.indexOf(b.format));
    const preferred = group[group.length - 1]; // newest format's name and version win
    return {
      id,
      name: preferred.name,
      vendor: group.find((g) => g.vendor)?.vendor ?? null,
      version: preferred.version ?? group.find((g) => g.version)?.version ?? null,
      formats: group.map((g) => ({ format: g.format, path: g.path, version: g.version })),
    };
  });
  plugins.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  return { ...base, plugins, durationMs: Date.now() - started };
}

module.exports = { scanVstFolders };
