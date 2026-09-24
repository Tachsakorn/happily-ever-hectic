import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `--mode single` inlines everything into one index.html so a build can be
// shared as a single self-contained page (used for quick iPad previews).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: {
    target: 'es2022',
    // The single-file preview must carry its fonts inline.
    assetsInlineLimit: mode === 'single' ? 100_000_000 : 4096,
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 2000,
  },
}));
