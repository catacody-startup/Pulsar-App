import type { Connection } from '../hooks/useHabitat';
import { t } from '../i18n/i18n';

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
      ? t('Habitat server · live')
      : connection === 'connecting'
        ? t('Habitat server · connecting…')
        : waiting > 0
          ? t(waiting === 1 ? 'Offline · {n} change waiting on this device' : 'Offline · {n} changes waiting on this device', { n: waiting })
          : t('Offline · showing the last data received');
  return (
    <p className="flex items-center gap-1.5 text-[11px] text-slate-400" role="status">
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[connection]}`} aria-hidden />
      {text}
    </p>
  );
}
