import { useEffect, useRef } from 'react';

interface Options {
  shouldLoad: boolean;
  onLoadMore: () => void;
}

export function useInfiniteScroll({ shouldLoad, onLoadMore }: Options) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && shouldLoad) {
        onLoadMore();
      }
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [shouldLoad, onLoadMore]);

  return ref;
}
