import { useEffect, useState } from 'react';

/**
 * 🧠 useSmoothLoading
 * - Arată loader-ul imediat când începe loading-ul
 * - Îl păstrează minim `minDuration` ms pe ecran
 * - Ascunde loader-ul doar după ce datele sunt gata ȘI a trecut durata minimă
 */
export function useSmoothLoading(
  isLoading: boolean,
  minDuration = 800
): boolean {
  const [showLoader, setShowLoader] = useState(isLoading);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    // 🚀 Când începe loading-ul
    if (isLoading) {
      setShowLoader(true);
      setStartTime(Date.now());
      return;
    }

    // 🕒 Când loading-ul s-a terminat, verificăm cât timp a trecut
    if (!isLoading && startTime) {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(minDuration - elapsed, 0);

      // asigurăm durata minimă de afișare
      const timer = setTimeout(() => {
        setShowLoader(false);
        setStartTime(null);
      }, remaining);

      return () => clearTimeout(timer);
    }
  }, [isLoading, minDuration, startTime]);

  return showLoader;
}
