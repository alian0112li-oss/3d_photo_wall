import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works both at the domain root and on
  // GitHub Pages project sites (https://<user>.github.io/3d_photo_wall/).
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  server: {
    port: 5173,
    open: false,
  },
});
