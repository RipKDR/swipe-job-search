/**
 * Swipe Engine — Pure math functions for 60FPS swipe card animations.
 *
 * No React, no gesture library dependencies — pure transformation math
 * that can be unit tested in isolation.
 */

/** Maximum rotation in degrees for a full swipe. */
export const MAX_ROTATION_DEG = 15;

/** Fraction of screen width used as swipe threshold (40%). */
export const SWIPE_THRESHOLD_FRACTION = 0.4;

/** Legacy absolute threshold (kept for backward compat) */
export const SWIPE_THRESHOLD = 80;

export interface SwipeDecision {
  direction: 'left' | 'right';
  velocity: number;
}

/**
 * Compute rotation in degrees from horizontal translation.
 *
 * Formula: (translateX / (SCREEN_WIDTH / 2)) * MAX_ROTATION_DEG
 * Clamped to ±MAX_ROTATION_DEG.
 */
export function computeRotation(
  translateX: number,
  screenWidthHalf: number,
): number {
  if (screenWidthHalf <= 0) return 0;
  const ratio = translateX / screenWidthHalf;
  const rotation = ratio * MAX_ROTATION_DEG;
  return Math.max(-MAX_ROTATION_DEG, Math.min(MAX_ROTATION_DEG, rotation));
}

/**
 * Compute overlay opacity (0–1) for a given swipe side.
 *
 * Returns 0 for the opposite side (e.g., left overlay doesn't show on right swipe).
 * Ramps from 0 at SWIPE_THRESHOLD to 1 at 1.5× SWIPE_THRESHOLD.
 */
export function computeOverlayOpacity(
  translateX: number,
  side: 'left' | 'right',
  screenWidth?: number,
): number {
  const threshold = screenWidth
    ? screenWidth * SWIPE_THRESHOLD_FRACTION
    : SWIPE_THRESHOLD;

  if (side === 'left') {
    if (translateX >= 0) return 0;
    const progress = Math.abs(translateX);
    const halfThreshold = threshold * 1.5;
    if (progress <= threshold) return 0;
    return Math.min(1, (progress - threshold) / (halfThreshold - threshold));
  }

  // side === 'right'
  if (translateX <= 0) return 0;
  const halfThreshold = threshold * 1.5;
  if (translateX <= threshold) return 0;
  return Math.min(1, (translateX - threshold) / (halfThreshold - threshold));
}

/**
 * Determine if a swipe should fire based on horizontal translation.
 *
 * Returns `null` if below threshold (40% of screen width).
 * Otherwise returns direction and a normalized velocity value.
 */
export function shouldSwipe(
  translateX: number,
  screenWidth: number,
): SwipeDecision | null {
  const threshold = screenWidth * SWIPE_THRESHOLD_FRACTION;

  if (Math.abs(translateX) < threshold) return null;

  const direction = translateX > 0 ? 'right' : 'left';
  const velocity = Math.abs(translateX) / screenWidth;

  return { direction, velocity };
}
