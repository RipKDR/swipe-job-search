import { useState, useCallback } from 'react';
import type { Job } from '@hi-hired/shared';

/**
 * useSwipeUndo
 * Manages undo stack for the existing SwipeDeck optimistic state.
 * Provides reverse animation hook + last swiped job for "Undo" toast/banner.
 *
 * Designed to layer on top of useJobDeck without modifying core files.
 * Source pattern: React Native Reanimated withSpring reverse (existing SwipeCard usage).
 */
export interface SwipeUndoState {
  lastJob: Job | null;
  lastDirection: 'left' | 'right' | 'super' | null;
  canUndo: boolean;
}

export function useSwipeUndo() {
  const [undoState, setUndoState] = useState<SwipeUndoState>({
    lastJob: null,
    lastDirection: null,
    canUndo: false,
  });

  const recordSwipe = useCallback((job: Job, direction: 'left' | 'right' | 'super') => {
    setUndoState({
      lastJob: job,
      lastDirection: direction,
      canUndo: true,
    });
  }, []);

  const clearUndo = useCallback(() => {
    setUndoState({
      lastJob: null,
      lastDirection: null,
      canUndo: false,
    });
  }, []);

  // Returns the job to re-insert into deck + direction for animation reversal
  const undoLast = useCallback(() => {
    const { lastJob, lastDirection } = undoState;
    if (!lastJob) return null;

    clearUndo();
    return { job: lastJob, direction: lastDirection };
  }, [undoState, clearUndo]);

  return {
    ...undoState,
    recordSwipe,
    undoLast,
    clearUndo,
  };
}
