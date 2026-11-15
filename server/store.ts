/** Where the habitat server keeps its state: a JSON file, written atomically. */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { emptyState, parseState, type ServerState } from './faces';

export interface Store {
  load(): ServerState;
  save(state: ServerState): Promise<void>;
}

export function createFileStore(file: string, crewIds: readonly string[]): Store {
  let queue: Promise<void> = Promise.resolve();
  return {
    load() {
      if (!existsSync(file)) return emptyState();
      return parseState(JSON.parse(readFileSync(file, 'utf8')), crewIds);
    },
    // Writes go one after the other; each one lands whole or not at all (write, then rename).
    save(state) {
      const write = async () => {
        mkdirSync(dirname(file), { recursive: true });
        const tmp = `${file}.tmp`;
        await writeFile(tmp, JSON.stringify(state), { mode: 0o600 });
        await rename(tmp, file);
      };
      queue = queue.then(write, write);
      return queue;
    },
  };
}

export function createMemoryStore(initial: ServerState = emptyState()): Store & { saved: ServerState } {
  const store = {
    saved: initial,
    load: () => store.saved,
    save: async (state: ServerState) => {
      store.saved = state;
    },
  };
  return store;
}
