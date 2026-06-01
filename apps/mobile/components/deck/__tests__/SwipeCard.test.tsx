import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { SwipeCard } from '../SwipeCard';
import { mockJobs } from '@/lib/mocks/jobs';

// ── Helpers ────────────────────────────────────────────────────────────────

function renderWithQuery(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('SwipeCard (U5 TDD: render, stack, gesture boundary, overlay)', () => {
  it('renders top card with job title and pay', () => {
    renderWithQuery(
      <SwipeCard
        job={mockJobs[0]}
        index={0}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    expect(screen.getByText(mockJobs[0].title)).toBeTruthy();
    // Pay display text like "$32/hr"
    expect(screen.getByText(/\$32/)).toBeTruthy();
  });

  it('renders PASS and APPLY overlay text for the top card', () => {
    renderWithQuery(
      <SwipeCard
        job={mockJobs[0]}
        index={0}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
      />,
    );
    expect(screen.getByText('PASS')).toBeTruthy();
    expect(screen.getByText('APPLY')).toBeTruthy();
  });

  it('renders non-top cards at indices 1 and 2 without error', () => {
    const { container: c1 } = renderWithQuery(
      <SwipeCard job={mockJobs[1]} index={1} onSwipeLeft={vi.fn()} onSwipeRight={vi.fn()} />,
    );
    const { container: c2 } = renderWithQuery(
      <SwipeCard job={mockJobs[2]} index={2} onSwipeLeft={vi.fn()} onSwipeRight={vi.fn()} />,
    );
    expect(c1.querySelectorAll('div').length).toBeGreaterThan(0);
    expect(c2.querySelectorAll('div').length).toBeGreaterThan(0);
  });

  it('accepts optional onCardPress callback', () => {
    const onPress = vi.fn();
    renderWithQuery(
      <SwipeCard
        job={mockJobs[0]}
        index={0}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
        onCardPress={onPress}
      />,
    );
    expect(screen.getByText(mockJobs[0].title)).toBeTruthy();
  });

  it('accepts optional userLocation for distance badge', () => {
    renderWithQuery(
      <SwipeCard
        job={mockJobs[0]}
        index={0}
        onSwipeLeft={vi.fn()}
        onSwipeRight={vi.fn()}
        userLocation={{ latitude: -37.81, longitude: 144.97 }}
      />,
    );
    expect(screen.getByText(mockJobs[0].title)).toBeTruthy();
  });

  it('renders all three stack positions (0, 1, 2) without error', () => {
    for (const index of [0, 1, 2] as const) {
      const { unmount } = renderWithQuery(
        <SwipeCard
          job={mockJobs[index]}
          index={index}
          onSwipeLeft={vi.fn()}
          onSwipeRight={vi.fn()}
        />,
      );
      expect(screen.getByText(mockJobs[index].title)).toBeTruthy();
      unmount();
    }
  });

  it('exports all contract exports from the deck module', async () => {
    const mod = await import('../SwipeDeck');
    expect(mod.SwipeDeck).toBeDefined();
    expect(typeof mod.SwipeDeck).toBe('function');
  });
});

describe('SwipeCard gesture contract (pure function boundaries)', () => {
  it('exports swipe-engine functions used by gesture logic', async () => {
    const engine = await import('@/lib/swipe-engine');
    expect(typeof engine.shouldSwipe).toBe('function');
    expect(typeof engine.computeRotation).toBe('function');
    expect(typeof engine.computeOverlayOpacity).toBe('function');
    expect(engine.SWIPE_THRESHOLD_FRACTION).toBe(0.4);
    expect(engine.MAX_ROTATION_DEG).toBe(15);
  });

  it('swipe-engine shouldSwipe returns null below 40% threshold', async () => {
    const { shouldSwipe: engineShouldSwipe, SWIPE_THRESHOLD_FRACTION } =
      await import('@/lib/swipe-engine');
    const screenWidth = 400;
    const threshold = screenWidth * SWIPE_THRESHOLD_FRACTION; // 160
    expect(engineShouldSwipe(0, screenWidth)).toBeNull();
    expect(engineShouldSwipe(threshold - 1, screenWidth)).toBeNull();
    expect(engineShouldSwipe(-(threshold - 1), screenWidth)).toBeNull();
  });

  it('swipe-engine shouldSwipe returns direction above threshold', async () => {
    const { shouldSwipe: engineShouldSwipe } = await import('@/lib/swipe-engine');
    const screenWidth = 400;
    const right = engineShouldSwipe(200, screenWidth);
    expect(right).not.toBeNull();
    expect(right!.direction).toBe('right');
    expect(typeof right!.velocity).toBe('number');
    const left = engineShouldSwipe(-200, screenWidth);
    expect(left).not.toBeNull();
    expect(left!.direction).toBe('left');
  });

  it('swipe-engine computeRotation stays within ±MAX_ROTATION_DEG', async () => {
    const { computeRotation: engineRotation, MAX_ROTATION_DEG } =
      await import('@/lib/swipe-engine');
    expect(engineRotation(999, 200)).toBeLessThanOrEqual(MAX_ROTATION_DEG);
    expect(engineRotation(-999, 200)).toBeGreaterThanOrEqual(-MAX_ROTATION_DEG);
    expect(engineRotation(0, 200)).toBe(0);
  });

  it('swipe-engine computeOverlayOpacity shows PASS on left, APPLY on right', async () => {
    const { computeOverlayOpacity } = await import('@/lib/swipe-engine');
    // Threshold = 400 * 0.4 = 160. Opacity starts ramping above threshold.
    expect(computeOverlayOpacity(-200, 'left', 400)).toBeGreaterThan(0);
    expect(computeOverlayOpacity(-200, 'right', 400)).toBe(0);
    expect(computeOverlayOpacity(200, 'right', 400)).toBeGreaterThan(0);
    expect(computeOverlayOpacity(200, 'left', 400)).toBe(0);
    expect(computeOverlayOpacity(0, 'left', 400)).toBe(0);
    expect(computeOverlayOpacity(0, 'right', 400)).toBe(0);
  });
});
