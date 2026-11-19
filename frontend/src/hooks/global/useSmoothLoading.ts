import { useEffect, useState } from 'react';

/**
 * 🧠 useSmoothLoading
 * - Shows the loader immediately when loading starts
 * - Keeps it on screen for at least `minDuration` ms
 * - Hides the loader only once the data is ready AND the minimum duration has passed
 */
export function useSmoothLoading(
  isLoading: boolean,
  minDuration = 800
): boolean {
  const [showLoader, setShowLoader] = useState(isLoading);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    // When loading starts
    if (isLoading) {
      setShowLoader(true);
      setStartTime(Date.now());
      return;
    }

    // When loading has finished, check how much time has passed
    if (!isLoading && startTime) {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(minDuration - elapsed, 0);

      // ensure the minimum display duration
      const timer = setTimeout(() => {
        setShowLoader(false);
        setStartTime(null);
      }, remaining);

      return () => clearTimeout(timer);
    }
  }, [isLoading, minDuration, startTime]);

  return showLoader;
}
