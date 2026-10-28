// Lets Node run the app's TypeScript as it is written: imports without a file extension are found, and the few places
// that read Vite's import.meta.env get an empty one. Used only by `npm test`.
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) {
      for (const suffix of ['.ts', '/index.ts']) {
        try {
          return await next(specifier + suffix, context);
        } catch {
          // try the next one
        }
      }
    }
    throw e;
  }
}

export async function load(url, context, next) {
  const result = await next(url, context);
  if (url.endsWith('.ts') && result.source && String(result.source).includes('import.meta.env')) {
    return { ...result, source: `import.meta.env ??= {};\n${result.source}` };
  }
  return result;
}
