import { ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { refreshIfExpired, stripToken, withCurrentToken } from '../services/auth';

// Sources already displayed once in this session: remounts (navigating back,
// re-opening a modal) render them instantly instead of flashing a skeleton.
const loadedSrcs = new Set<string>();

const RETRY_DELAYS = [1500, 4000, 9000];

interface Props {
  src: string;
  alt: string;
  /** Classes for the container: size, aspect ratio, rounding, margins. */
  wrapperClassName?: string;
  /** Classes for the <img> itself. */
  imgClassName?: string;
  /** Ask the backend for a downscaled copy (96 for tiny thumbs, 480 for cards, 800 for the modal). */
  width?: 96 | 480 | 800;
  /** Shown when the image is missing or failed after all retries. */
  fallback?: ReactNode;
}

const withParam = (src: string, key: string, value: string | number) =>
  `${src}${src.includes('?') ? '&' : '?'}${key}=${value}`;

const buildSrc = (src: string, width: number | undefined, attempt: number) => {
  let url = withCurrentToken(src);
  if (width && url.includes('/api/home_inventory/images/')) {
    url = withParam(url, 'w', width);
  }
  return attempt === 0 ? url : withParam(url, 'r', attempt);
};

export default function SmartImage({
  src,
  alt,
  wrapperClassName = '',
  imgClassName = '',
  width,
  fallback = null,
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(() => loadedSrcs.has(stripToken(src)));
  const [failed, setFailed] = useState(false);

  const markLoaded = useCallback(() => {
    loadedSrcs.add(stripToken(src));
    setLoaded(true);
    setFailed(false);
  }, [src]);

  // New source: reset state (cached images flip to loaded right away).
  useLayoutEffect(() => {
    setAttempt(0);
    setFailed(false);
    setLoaded(loadedSrcs.has(stripToken(src)));
  }, [src]);

  // Image served from cache before React attached onLoad.
  useLayoutEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) markLoaded();
  }, [src, attempt, markLoaded]);

  // Retry with backoff on slow/unstable connections.
  const handleError = async () => {
    if (attempt < RETRY_DELAYS.length) {
      const next = attempt + 1;
      // Expired token: refresh it and retry right away (render re-reads the token).
      const refreshed = await refreshIfExpired().catch(() => false);
      window.setTimeout(() => setAttempt(next), refreshed ? 0 : RETRY_DELAYS[attempt]);
    } else {
      setFailed(true);
    }
  };

  // Connection came back: try again.
  useEffect(() => {
    if (!failed) return;
    const retry = () => {
      setFailed(false);
      setAttempt((a) => a + 1);
    };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [failed]);

  return (
    <div
      className={`relative overflow-hidden bg-ha-secondary-bg ${wrapperClassName}`}
    >
      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center text-ha-text/30">
          {fallback}
        </div>
      ) : (
        <>
          {!loaded && <div className="img-skeleton absolute inset-0" />}
          <img
            ref={imgRef}
            src={buildSrc(src, width, attempt)}
            alt={alt}
            loading="lazy"
            decoding="async"
            draggable={false}
            onLoad={markLoaded}
            onError={handleError}
            className={`w-full h-full object-cover drag-none transition-opacity duration-500 ${
              loaded ? 'opacity-100' : 'opacity-0'
            } ${imgClassName}`}
          />
        </>
      )}
    </div>
  );
}
