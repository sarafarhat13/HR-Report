import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// A relative base (`./`) keeps every bundled Modus asset resolvable no matter
// which GitHub Pages sub-path the app is served from (e.g. `/HR-Report/`).
// Combined with Hash History routing this guarantees deep links never 404 on
// static hosting. To pin to a specific repo instead, swap this for
// `base: '/<repo-name>/'`.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
