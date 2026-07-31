import { useEffect, useState } from 'react';

/** A quiet clock for labels and date locks that must update while a screen stays open. */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
