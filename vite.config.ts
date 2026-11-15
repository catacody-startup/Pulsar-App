/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { serviceWorker } from './pwa/plugin';

export default defineConfig({
  plugins: [react(), serviceWorker()],
  // In development the habitat server runs apart (npm run server): Vite passes /api to it.
  server: { proxy: { '/api': 'http://localhost:8080' } },
  // face-api.js (with TensorFlow.js) is one 1.3 MB chunk, loaded only when someone signs in.
  build: { chunkSizeWarningLimit: 1400 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
  },
});
