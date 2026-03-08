import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: 'src/renderer',
  envDir: path.resolve(__dirname),
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      'yua-shared': path.resolve(__dirname, '../yua-shared/src'),
    },
  },
  build: {
    outDir: 'dist/renderer',
  },
  css: {
    postcss: './postcss.config.js',
  },
});
