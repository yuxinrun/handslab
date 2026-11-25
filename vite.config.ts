import { defineConfig } from 'vite';

export default defineConfig({
  base: '/handslab/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    cssCodeSplit: false,
    chunkSizeWarningLimit: 900,
  },
});
