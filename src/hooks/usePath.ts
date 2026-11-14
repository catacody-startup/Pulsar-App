import { useCallback, useEffect, useState } from 'react';

/** Current path, kept in sync with the browser history (a two-page app needs no router). */
export function usePath(): [string, (path: string) => void] {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const navigate = useCallback((next: string) => {
    if (next === window.location.pathname) return;
    // Keep the demo scenario (?scenario=…) when moving between pages.
    window.history.pushState(null, '', next + window.location.search);
    setPath(next);
    window.scrollTo(0, 0);
  }, []);
  return [path, navigate];
}
