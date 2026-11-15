/** Where the habitat server keeps its data: a JSON file, written atomically. */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { emptyHabitat, parseHabitatData, type HabitatData } from '../src/logic/habitat';

export interface Store {
  load(): HabitatData;
  save(data: HabitatData): Promise<void>;
}

export function createFileStore(file: string, crewIds: readonly string[]): Store {
  let queue: Promise<void> = Promise.resolve();
  return {
    load() {
      if (!existsSync(file)) return emptyHabitat();
      return parseHabitatData(JSON.parse(readFileSync(file, 'utf8')), crewIds);
    },
    // Writes go one after the other; each one lands whole or not at all (write, then rename).
    save(data) {
      const write = async () => {
        mkdirSync(dirname(file), { recursive: true });
        const tmp = `${file}.tmp`;
        await writeFile(tmp, JSON.stringify(data));
        await rename(tmp, file);
      };
      queue = queue.then(write, write);
      return queue;
    },
  };
}

export function createMemoryStore(initial: HabitatData = emptyHabitat()): Store & { saved: HabitatData } {
  const store = {
    saved: initial,
    load: () => store.saved,
    save: async (data: HabitatData) => {
      store.saved = data;
    },
  };
  return store;
}
