/** Starts the habitat server. Env: PORT (8080), DATA_FILE (./data/habitat.json). */
import { createServer } from 'node:http';
import { CREW } from '../src/config/crew';
import { MISSION } from '../src/config/mission';
import { createApp } from './app';
import { createFileStore } from './store';

declare const __PULSAR_VERSION__: string;

const port = Number(process.env.PORT ?? 8080);
const file = process.env.DATA_FILE ?? './data/habitat.json';
const crewIds = CREW.map((c) => c.id);
const app = createApp({
  store: createFileStore(file, crewIds),
  crewIds,
  crewNames: Object.fromEntries(CREW.map((c) => [c.id, c.name])),
  eastLongitudeDeg: MISSION.site.eastLongitudeDeg,
  version: typeof __PULSAR_VERSION__ === 'string' ? __PULSAR_VERSION__ : 'dev',
});

const server = createServer((req, res) => void app.handle(req, res));
server.listen(port, () => console.log(`Pulsar habitat server on :${port}, data in ${file}`));

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    app.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  });
}
