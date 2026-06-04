import { useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { performSwipe, type SwipeInput, type SwipeResult } from '@/lib/swipe';

/**
 * Hook wrapper (thin). Real logic in lib/swipe.ts for testability (no renderer dep).
 * Per plan: optimistic owned by caller (useJobDeck).
 */
export function useSwipe() {
  const swipingRef = useRef(false);

  const swipe = async (input: SwipeInput): Promise<SwipeResult> => {
    if (swipingRef.current) return { success: false };
    swipingRef.current = true;
    try {
      return await performSwipe(supabase, input);
    } finally {
      swipingRef.current = false;
    }
  };

  return { swipe };
}
