import type { Connection } from '../hooks/useHabitat';

interface Props {
  connection: Connection;
  /** Changes made on this device that have not reached the server yet. */
  waiting: number;
}

const DOT: Record<Connection, string> = { live: 'bg-ok', connecting: 'bg-slate-500', offline: 'bg-watch' };

/** Whether this device is in touch with the habitat server, in a few words. */
export function HabitatStatus({ connection, waiting }: Props) {
  const text =
    connection === 'live'
      ? 'Habitat server · live'
      : connection === 'connecting'
        ? 'Habitat server · connecting…'
        : waiting > 0
          ? `Offline · ${waiting} change${waiting === 1 ? '' : 's'} waiting on this device`
          : 'Offline · showing the last data received';
  return (
    <p className="flex items-center gap-1.5 text-[11px] text-slate-400" role="status">
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[connection]}`} aria-hidden />
      {text}
    </p>
  );
}
