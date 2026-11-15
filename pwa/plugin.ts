import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

/** Files of public/ kept on install (the face models are kept on first use: ~7 MB). */
const PUBLIC_SHELL = ['/pulsar.svg', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/apple-touch-icon.png', '/manifest.webmanifest'];

/**
 * Writes sw.js at build time: the template with the app shell of this build
 * (page, entry script, its static imports and styles). Lazy chunks (face
 * recognition, PDF) are kept the first time they load.
 */
export function serviceWorker(): Plugin {
  return {
    name: 'pulsar-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const shell = new Set<string>(['/index.html', ...PUBLIC_SHELL]);
      const visit = (name: string) => {
        const file = bundle[name];
        if (!file || shell.has(`/${name}`)) return;
        shell.add(`/${name}`);
        if (file.type === 'chunk') {
          file.imports.forEach(visit);
          file.viteMetadata?.importedCss.forEach((css) => shell.add(`/${css}`));
        }
      };
      for (const [name, file] of Object.entries(bundle)) if (file.type === 'chunk' && file.isEntry) visit(name);
      const precache = [...shell].sort();
      const version = createHash('sha256').update(precache.join('\n')).digest('hex').slice(0, 12);
      const template = readFileSync(fileURLToPath(new URL('./sw.template.js', import.meta.url)), 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template.replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(precache)),
      });
    },
  };
}
