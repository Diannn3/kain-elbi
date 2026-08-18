// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';
import vercel from '@astrojs/vercel';

// Public UPPETITE stays prerendered by default. Only pages declaring
// export const prerender = false become Vercel server functions.
export default defineConfig({
  integrations: [svelte()],
  adapter: vercel({
    // loadBuildData() reads these canonical catalog files from disk in the
    // on-demand Freshie and Places Ops functions.
    includeFiles: ['./public/data/**'],
  }),
  vite: {
    build: {
      chunkSizeWarningLimit: 1024
    },
    optimizeDeps: {
      exclude: ['maplibre-gl']
    }
  }
});
