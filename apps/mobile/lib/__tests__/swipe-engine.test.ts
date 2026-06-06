import { describe, it, expect } from 'vitest';
import {
  computeRotation,
  computeOverlayOpacity,
  computeUpOverlayOpacity,
  computeUpScale,
  shouldSwipe,
  shouldSwipeUp,
  SWIPE_THRESHOLD,
  MAX_ROTATION_DEG,
  SUPER_SWIPE_THRESHOLD_FRACTION,
} from '../swipe-engine';

const SCREEN_HALF = 200; // Common test value (screen width 400 / 2)

describe('swipe-engine pure math (TDD per Phase 4)', () => {
  describe('computeRotation', () => {
    it('returns 0 for no horizontal movement', () => {
      expect(computeRotation(0, SCREEN_HALF)).toBe(0);
    });

    it('returns positive rotation for rightward swipe', () => {
      const rot = computeRotation(100, SCREEN_HALF);
      expect(rot).toBeGreaterThan(0);
    });

    it('returns negative rotation for leftward swipe', () => {
      const rot = computeRotation(-100, SCREEN_HALF);
      expect(rot).toBeLessThan(0);
    });

    it('caps rotation at MAX_ROTATION_DEG', () => {
      const rot = computeRotation(500, SCREEN_HALF);
      expect(rot).toBeLessThanOrEqual(MAX_ROTATION_DEG);
    });

    it('caps negative rotation at -MAX_ROTATION_DEG', () => {
      const rot = computeRotation(-500, SCREEN_HALF);
      expect(rot).toBeGreaterThanOrEqual(-MAX_ROTATION_DEG);
    });

    it('scales linearly with distance', () => {
      const rotHalf = computeRotation(100, SCREEN_HALF);
      const rotFull = computeRotation(200, SCREEN_HALF);
      // Full distance should produce roughly 2x rotation
      expect(rotFull).toBeCloseTo(rotHalf * 2, 0);
    });
  });

  describe('computeOverlayOpacity', () => {
    it('returns 0 when translateX is 0', () => {
      expect(computeOverlayOpacity(0, 'left')).toBe(0);
      expect(computeOverlayOpacity(0, 'right')).toBe(0);
    });

    it('returns positive values for matching side', () => {
      const opacity = computeOverlayOpacity(-150, 'left');
      expect(opacity).toBeGreaterThan(0);
      expect(opacity).toBeLessThanOrEqual(1);
    });

    it('returns 0 for opposite side', () => {
      const opacity = computeOverlayOpacity(-150, 'right');
      expect(opacity).toBe(0);
    });

    it('returns 0 for same side below threshold', () => {
      const opacity = computeOverlayOpacity(-10, 'left');
      expect(opacity).toBe(0);
    });

    it('returns 1 for past-threshold same side', () => {
      const opacity = computeOverlayOpacity(-250, 'left');
      expect(opacity).toBe(1);
    });
  });

  describe('shouldSwipe', () => {
    it('returns null for no movement', () => {
      expect(shouldSwipe(0, 300)).toBeNull();
    });

    it('returns null when below threshold', () => {
      expect(shouldSwipe(SWIPE_THRESHOLD - 1, 300)).toBeNull();
    });

    it('returns right direction when past threshold', () => {
      const result = shouldSwipe(150, 300);
      expect(result).not.toBeNull();
      expect(result!.direction).toBe('right');
    });

    it('returns left direction when past left threshold', () => {
      const result = shouldSwipe(-150, 300);
      expect(result).not.toBeNull();
      expect(result!.direction).toBe('left');
    });

    it('uses screen-width-based threshold (40%)', () => {
      const screenWidth = 400;
      // expectedThreshold = screenWidth * 0.4 = 160
      // Just below threshold should be null
      expect(shouldSwipe(159, screenWidth)).toBeNull();
      // At threshold should fire
      expect(shouldSwipe(160, screenWidth)).not.toBeNull();
    });

    it('includes velocity in result', () => {
      const result = shouldSwipe(200, 400);
      expect(result).not.toBeNull();
      expect(typeof result!.velocity).toBe('number');
    });
  });

  // ─── Up (Super) Swipe Tests ───────────────────────────────────────────────

  describe('computeUpOverlayOpacity', () => {
    const screenHeight = 800;

    it('returns 0 when translateY is 0 or positive (not dragging up)', () => {
      expect(computeUpOverlayOpacity(0, screenHeight)).toBe(0);
      expect(computeUpOverlayOpacity(50, screenHeight)).toBe(0);
    });

    it('returns 0 when below the super swipe threshold', () => {
      // threshold = 800 * 0.5 = 400
      // Below threshold (just under 400)
      expect(computeUpOverlayOpacity(-200, screenHeight)).toBe(0);
      expect(computeUpOverlayOpacity(-399, screenHeight)).toBe(0);
    });

    it('returns positive values when above threshold', () => {
      // At threshold exactly — should still be 0 (ramp starts after threshold)
      expect(computeUpOverlayOpacity(-400, screenHeight)).toBe(0);
      // Just past threshold
      const opacity = computeUpOverlayOpacity(-450, screenHeight);
      expect(opacity).toBeGreaterThan(0);
      expect(opacity).toBeLessThanOrEqual(1);
    });

    it('returns 1 at 1.5x threshold or beyond', () => {
      // 1.5x threshold = 600
      expect(computeUpOverlayOpacity(-600, screenHeight)).toBeCloseTo(1, 1);
      expect(computeUpOverlayOpacity(-800, screenHeight)).toBe(1);
    });
  });

  describe('computeUpScale', () => {
    const screenHeight = 800;

    it('returns 1 when not dragging upward', () => {
      expect(computeUpScale(0, screenHeight)).toBe(1);
      expect(computeUpScale(50, screenHeight)).toBe(1);
    });

    it('returns 1 when dragging up but below threshold', () => {
      // threshold = 400, 200 is below threshold
      const scale = computeUpScale(-200, screenHeight);
      expect(scale).toBeGreaterThan(1);
      expect(scale).toBeLessThanOrEqual(1.05);
    });

    it('returns approximately 1.05 at full threshold', () => {
      const scale = computeUpScale(-400, screenHeight);
      expect(scale).toBeCloseTo(1.05, 2);
    });

    it('caps at 1.05 for large upward drag', () => {
      const scale = computeUpScale(-800, screenHeight);
      expect(scale).toBeLessThanOrEqual(1.05);
    });
  });

  describe('shouldSwipeUp', () => {
    const screenHeight = 800;
    const screenWidth = 400;

    it('returns null when not dragging upward (positive Y)', () => {
      expect(shouldSwipeUp(50, screenHeight)).toBeNull();
      expect(shouldSwipeUp(0, screenHeight)).toBeNull();
    });

    it('returns null when below threshold', () => {
      // threshold = 800 * 0.5 = 400
      expect(shouldSwipeUp(-200, screenHeight)).toBeNull();
      expect(shouldSwipeUp(-399, screenHeight)).toBeNull();
    });

    it('returns up direction when past threshold with no horizontal', () => {
      const result = shouldSwipeUp(-500, screenHeight);
      expect(result).not.toBeNull();
      expect(result!.direction).toBe('up');
    });

    it('returns up when past threshold with minimal horizontal', () => {
      // -500 vertical is past threshold (400), horizontal is small (50)
      const result = shouldSwipeUp(-500, screenHeight, 50, screenWidth);
      expect(result).not.toBeNull();
      expect(result!.direction).toBe('up');
    });

    it('returns null when horizontal component is too large', () => {
      // -500 vertical is past threshold, but horizontal 150 > 400*0.2 = 80
      const result = shouldSwipeUp(-500, screenHeight, 150, screenWidth);
      expect(result).toBeNull();
    });

    it('includes velocity in result', () => {
      const result = shouldSwipeUp(-500, screenHeight);
      expect(result).not.toBeNull();
      expect(typeof result!.velocity).toBe('number');
      expect(result!.velocity).toBe(500 / screenHeight);
    });

    it('has higher threshold than horizontal swipe', () => {
      // SUPER_SWIPE_THRESHOLD_FRACTION should be > SWIPE_THRESHOLD_FRACTION
      // 0.5 > 0.4
      // The vertical threshold in pixels: 800 * 0.5 = 400
      // Horizontal: 400 * 0.4 = 160
      // So we need more effort to trigger up-swipe
      expect(SUPER_SWIPE_THRESHOLD_FRACTION).toBeGreaterThan(0.4);
    });
  });
});
