import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://farisradifana.my.id',
  output: 'static',
  // All CSS is inlined: two small pages, so no render-blocking stylesheet request.
  build: { inlineStylesheets: 'always' },
  // Never inline scripts/assets as data: URIs; the CSP only allows 'self'.
  vite: { build: { assetsInlineLimit: 0 } },
});
