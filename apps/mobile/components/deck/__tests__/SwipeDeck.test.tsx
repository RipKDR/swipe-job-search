import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SwipeDeck } from '../SwipeDeck';
import { mockJobs } from '@/lib/mocks/jobs';

describe('SwipeDeck (U5 TDD: render, empty, a11y buttons, threshold via pure)', () => {
  it('renders title and pay from top job', () => {
    const onSwipe = vi.fn();
    render(<SwipeDeck jobs={mockJobs} onSwipe={onSwipe} />);
    expect(screen.getByText(mockJobs[0].title)).toBeTruthy();
    expect(screen.getByText(/\$32/)).toBeTruthy();
  });

  it('empty deck shows message (no more jobs)', () => {
    const onSwipe = vi.fn();
    render(<SwipeDeck jobs={[]} onSwipe={onSwipe} />);
    expect(screen.getByText(/no more jobs/i)).toBeTruthy();
  });

  it('a11y tap buttons fire same as swipe (PASS / APPLY)', () => {
    const onSwipe = vi.fn();
    render(<SwipeDeck jobs={mockJobs.slice(0,1)} onSwipe={onSwipe} />);
    fireEvent.press(screen.getByTestId('pass-button'));
    expect(onSwipe).toHaveBeenCalledWith(mockJobs[0].id, 'left');

    // re-render with fresh for second
    render(<SwipeDeck jobs={mockJobs.slice(0,1)} onSwipe={onSwipe} />);
    fireEvent.press(screen.getByTestId('apply-button'));
    expect(onSwipe).toHaveBeenCalledWith(mockJobs[0].id, 'right');
  });

  // Threshold covered in lib/gesture.test.ts (pure, before component)
});
