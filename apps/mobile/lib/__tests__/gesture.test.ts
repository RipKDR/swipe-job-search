import { describe, it, expect } from 'vitest';
import { computeSwipeDirection, SWIPE_THRESHOLD } from '../gesture';

describe('gesture threshold logic (TDD per TESTING_STRATEGY + U5)', () => {
  it('returns null if swipe distance below threshold (no fire)', () => {
    expect(computeSwipeDirection(0)).toBeNull();
    expect(computeSwipeDirection(50)).toBeNull();
    expect(computeSwipeDirection(-79)).toBeNull();
    expect(computeSwipeDirection(SWIPE_THRESHOLD - 1)).toBeNull();
  });

  it('returns "right" for positive dx >= threshold', () => {
    expect(computeSwipeDirection(SWIPE_THRESHOLD)).toBe('right');
    expect(computeSwipeDirection(120)).toBe('right');
    expect(computeSwipeDirection(200)).toBe('right');
  });

  it('returns "left" for negative dx <= -threshold', () => {
    expect(computeSwipeDirection(-SWIPE_THRESHOLD)).toBe('left');
    expect(computeSwipeDirection(-120)).toBe('left');
    expect(computeSwipeDirection(-200)).toBe('left');
  });

  it('uses custom threshold when provided', () => {
    expect(computeSwipeDirection(90, 100)).toBeNull();
    expect(computeSwipeDirection(100, 100)).toBe('right');
    expect(computeSwipeDirection(-100, 100)).toBe('left');
  });
});
