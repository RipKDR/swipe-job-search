import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { SwipeDeck } from '../SwipeDeck';
import { mockJobs } from '@/lib/mocks/jobs';

function renderWithQuery(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('SwipeDeck (U5 TDD: render, empty, a11y buttons, threshold via pure)', () => {
  it('renders title and pay from top job', () => {
    const onSwipe = vi.fn();
    renderWithQuery(<SwipeDeck jobs={mockJobs} onSwipe={onSwipe} />);
    expect(screen.getByText(mockJobs[0].title)).toBeTruthy();
    expect(screen.getByText(/\$32/)).toBeTruthy();
  });

  it('empty deck shows message (no more jobs)', () => {
    const onSwipe = vi.fn();
    renderWithQuery(<SwipeDeck jobs={[]} onSwipe={onSwipe} />);
    expect(screen.getByText(/no more jobs/i)).toBeTruthy();
  });

  it('a11y tap buttons fire same as swipe (PASS / APPLY)', () => {
    const onSwipe = vi.fn();
    renderWithQuery(<SwipeDeck jobs={mockJobs.slice(0, 1)} onSwipe={onSwipe} />);
    fireEvent.press(screen.getByTestId('pass-button'));
    expect(onSwipe).toHaveBeenCalledWith(mockJobs[0].id, 'left');

    renderWithQuery(<SwipeDeck jobs={mockJobs.slice(0, 1)} onSwipe={onSwipe} />);
    fireEvent.press(screen.getByTestId('apply-button'));
    expect(onSwipe).toHaveBeenCalledWith(mockJobs[0].id, 'right');
  });
});
