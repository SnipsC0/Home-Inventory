import { useState, useCallback } from 'react';

interface UseItemInteractionsOptions {
  onSingleClick?: (e: React.MouseEvent) => void;
  onRightClick?: (e: React.MouseEvent) => void;
  onLongPress?: () => void;
  longPressDuration?: number;
  excludeSelector?: string;
}

export function useInteractions({
  onSingleClick,
  onRightClick,
  onLongPress,
  longPressDuration = 500,
  excludeSelector = '.qty-btn',
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
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
    setLongPressTimer(null);
  }, [longPressTimer]);

  const handleTouchMove = useCallback(() => {
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
