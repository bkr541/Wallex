// A logo for a linked bank, for its tab. Plaid does not say where a bank's website is, so the bank's name is turned into a
// site address: the well-known ones are listed, and for any other the usual words are dropped ("Georgia United Credit Union"
// becomes georgiaunited.com). If the site has no icon, the tab shows the bank's initials instead.

const KNOWN: [RegExp, string][] = [
  [/bank of america|bofa/i, 'bankofamerica.com'],
  [/wells fargo/i, 'wellsfargo.com'],
  [/capital one/i, 'capitalone.com'],
  [/navy federal/i, 'navyfederal.org'],
  [/\busaa\b/i, 'usaa.com'],
  [/\bpnc\b/i, 'pnc.com'],
  [/citi(bank)?\b/i, 'citi.com'],
  [/u\.?s\.? bank/i, 'usbank.com'],
  [/\bally\b/i, 'ally.com'],
  [/american express|amex/i, 'americanexpress.com'],
  [/\bdiscover\b/i, 'discover.com'],
  [/truist/i, 'truist.com'],
  [/td bank/i, 'td.com'],
  [/regions/i, 'regions.com'],
  [/fifth third/i, '53.com'],
  [/\bsofi\b/i, 'sofi.com'],
  [/chime/i, 'chime.com'],
  [/citizens/i, 'citizensbank.com'],
  [/huntington/i, 'huntington.com'],
  [/charles schwab|schwab/i, 'schwab.com'],
  [/marcus/i, 'marcus.com'],
  [/varo/i, 'varomoney.com'],
  [/current\b/i, 'current.com'],
  [/robinhood/i, 'robinhood.com'],
];

const DROP = /\b(credit union|federal credit union|bank|banking|financial|federal|savings|national association|n\.?a\.?|inc|corporation|corp|group|of|the|and)\b/gi;

export function bankDomain(name: string): string | null {
  const known = KNOWN.find(([re]) => re.test(name));
  if (known) return known[1];
  const base = name.replace(DROP, ' ').toLowerCase().replace(/[^a-z0-9]+/g, '');
  return base.length >= 3 ? `${base}.com` : null;
}

export const bankLogoSources = (name: string): string[] => {
  const domain = bankDomain(name);
  return domain ? [`https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128`] : [];
};
