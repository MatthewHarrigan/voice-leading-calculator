import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// GitHub Pages serves project sites under /<repo>/. In dev we serve from root.
const REPO_BASE = '/voice-leading-calculator/';

export default defineConfig(({ command }) => ({
  // VITE_BASE lets CI/e2e build at root ("/") while production Pages builds use the repo path.
  base: process.env.VITE_BASE ?? (command === 'build' ? REPO_BASE : '/'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/music/**', 'src/audio/**', 'src/state/**'],
    },
  },
}));
