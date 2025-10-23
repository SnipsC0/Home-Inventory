import { useState, useCallback } from 'react';
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
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (
        excludeSelector &&
        (e.target as HTMLElement).closest(excludeSelector)
      ) {
        return;
      }
      onSingleClick?.(e);
    },
    [onSingleClick, excludeSelector]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled) return;
      e.preventDefault();
      if (
        excludeSelector &&
        (e.target as HTMLElement).closest(excludeSelector)
      ) {
        return;
      }
      onRightClick?.(e);
    },
    [onRightClick, excludeSelector]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;

      if (
        excludeSelector &&
        (e.target as HTMLElement).closest(excludeSelector)
      ) {
        return;
      }
      const timer = setTimeout(() => {
        onLongPress?.();
      }, longPressDuration);
      setLongPressTimer(timer);
    },
    [onLongPress, longPressDuration, excludeSelector]
  );

  const handleTouchEnd = useCallback(() => {
    if (!enabled) return;

    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
    setLongPressTimer(null);
  }, [longPressTimer]);

  const handleTouchMove = useCallback(() => {
    if (!enabled) return;
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
    setLongPressTimer(null);
  }, [longPressTimer]);

  return {
    onClick: handleClick,
    onContextMenu: handleContextMenu,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchMove: handleTouchMove,
  };
}
