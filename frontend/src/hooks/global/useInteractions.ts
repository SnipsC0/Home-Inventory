import { useCallback, useEffect, useRef } from 'react';
import { ClickOrTouchEvent } from '../../types';

interface UseItemInteractionsOptions {
  onSingleClick?: (e: React.MouseEvent) => void;
  onRightClick?: (e: React.MouseEvent) => void;
  onLongPress?: (e: ClickOrTouchEvent) => void;
  longPressDuration?: number;
  excludeSelector?: string;
  enabled?: boolean;
}

export function useInteractions({
  onSingleClick,
  onRightClick,
  onLongPress,
  longPressDuration = 500,
  excludeSelector = '.qty-btn',
  enabled = true,
}: UseItemInteractionsOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set when a long press fired, so the follow-up click/contextmenu is ignored
  const longPressFiredRef = useRef(false);
  const lastTouchRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const isExcluded = (e: React.SyntheticEvent) =>
    !!excludeSelector && !!(e.target as HTMLElement).closest(excludeSelector);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (longPressFiredRef.current) {
        // Swallow the click generated when releasing a long press
        longPressFiredRef.current = false;
        e.preventDefault();
        return;
      }
      if (isExcluded(e)) return;
      onSingleClick?.(e);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onSingleClick, excludeSelector]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      // Always block the native menu (image save/select on mobile long press)
      e.preventDefault();
      if (!enabled) return;
      if (isExcluded(e)) return;
      // On touch devices the long press timer already handled it
      if (Date.now() - lastTouchRef.current < 1500) return;
      onRightClick?.(e);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onRightClick, excludeSelector, enabled]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      lastTouchRef.current = Date.now();
      longPressFiredRef.current = false;
      if (!enabled || isExcluded(e)) return;

      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        longPressFiredRef.current = true;
        onLongPress?.();
      }, longPressDuration);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onLongPress, longPressDuration, excludeSelector, enabled, clearTimer]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      lastTouchRef.current = Date.now();
      clearTimer();
      // Prevent the synthesized click after a long press
      if (longPressFiredRef.current && e.cancelable) e.preventDefault();
    },
    [clearTimer]
  );

  const handleTouchMove = useCallback(() => {
    clearTimer();
    longPressFiredRef.current = false;
  }, [clearTimer]);

  return {
    onClick: handleClick,
    onContextMenu: handleContextMenu,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchMove: handleTouchMove,
    onTouchCancel: handleTouchMove,
  };
}
