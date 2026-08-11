// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';

// https://astro.build/config
export default defineConfig({
  integrations: [svelte()],
  vite: {
    build: {
      chunkSizeWarningLimit: 1024
    },
    optimizeDeps: {
      exclude: ['maplibre-gl']
    }
  }
});