export const SWIPE_THRESHOLD = 80;

export type SwipeDirection = 'left' | 'right' | null;

/**
 * Pure gesture threshold logic (TDD-first, no RN deps).
 * Used by useSwipe + SwipeDeck for deciding commit vs cancel.
 * Extracted so it can be unit tested in isolation per TESTING_STRATEGY.md.
 */
export function computeSwipeDirection(dx: number, threshold = SWIPE_THRESHOLD): SwipeDirection {
  if (Math.abs(dx) < threshold) return null;
  return dx > 0 ? 'right' : 'left';
}
