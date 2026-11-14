import { useEffect, useState } from 'react';

const MINUTE_MS = 60_000;

/** Current time, re-rendering right after each new minute starts (one reading per minute). */
export function useMinuteClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setNow(Date.now());
        schedule();
      }, MINUTE_MS - (Date.now() % MINUTE_MS) + 50);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);
  return now;
}
