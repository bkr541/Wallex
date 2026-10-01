// Company logo for a website, from Google's favicon service. Returns nothing for unknown sites,
// so the UI falls through to the next source (and finally to initials).
export const faviconUrl = (domain: string, size = 128) =>
  `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=${size}`;
