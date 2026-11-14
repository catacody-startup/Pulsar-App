import type { Status } from '../logic/types';

/** Tailwind classes per status, shared by every component. */
export const STATUS_STYLE: Record<Status, { dot: string; text: string; border: string; panel: string; chip: string }> = {
  ok: {
    dot: 'bg-ok',
    text: 'text-ok',
    border: 'border-slate-800',
    panel: 'border-ok/40 bg-ok/10',
    chip: 'bg-ok/15 text-ok',
  },
  watch: {
    dot: 'bg-watch',
    text: 'text-watch',
    border: 'border-watch/60',
    panel: 'border-watch/50 bg-watch/10',
    chip: 'bg-watch/15 text-watch',
  },
  act: {
    dot: 'bg-act',
    text: 'text-act',
    border: 'border-act/70',
    panel: 'border-act/60 bg-act/15',
    chip: 'bg-act/20 text-act',
  },
};
