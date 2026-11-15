import { defineConfig } from 'vite';

/** Build of the habitat server: one Node file, dist-server/main.mjs, with no dependencies. */
export default defineConfig({
  publicDir: false,
  define: { __PULSAR_VERSION__: JSON.stringify(process.env.PULSAR_VERSION ?? 'dev') },
  build: {
    ssr: 'server/main.ts',
    outDir: 'dist-server',
    emptyOutDir: true,
    target: 'node18',
    rollupOptions: { output: { entryFileNames: 'main.mjs' } },
  },
});
