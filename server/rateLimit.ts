/** Fixed-window rate limit per client: at most `limit` hits every `windowMs`. */
export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now) {
  const windows = new Map<string, { start: number; count: number }>();
  return function allow(key: string): boolean {
    const t = now();
    if (windows.size > 10_000) {
      for (const [k, w] of windows) if (t - w.start >= windowMs) windows.delete(k);
    }
    const w = windows.get(key);
    if (!w || t - w.start >= windowMs) {
      windows.set(key, { start: t, count: 1 });
      return true;
    }
    w.count++;
    return w.count <= limit;
  };
}
