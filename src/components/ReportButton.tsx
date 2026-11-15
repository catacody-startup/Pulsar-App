import { useState } from 'react';
import type { Report } from '../logic/report';

interface Props {
  /** Builds the report when the button is pressed. */
  make: () => Report;
  label: string;
  className?: string;
}

/** Downloads a health report for mission control as a PDF (the PDF library loads on the first press). */
export function ReportButton({ make, label, className }: Props) {
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');
  const download = async () => {
    setState('busy');
    try {
      const { downloadReportPdf } = await import('../report/pdf');
      await downloadReportPdf(make());
      setState('idle');
    } catch (e) {
      console.error('Report:', e);
      setState('error');
    }
  };
  return (
    <button
      type="button"
      onClick={download}
      disabled={state === 'busy'}
      className={
        className ??
        'rounded-md border border-slate-600 px-3 py-1 text-sm text-slate-100 hover:border-slate-400 hover:bg-slate-800 disabled:opacity-50'
      }
    >
      {state === 'busy' ? 'Preparing…' : state === 'error' ? 'Try again' : label}
    </button>
  );
}
