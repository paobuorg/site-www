import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://paobu.org',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
    optimizeDeps: {
      exclude: ['cesium'],
    },
  },
});
