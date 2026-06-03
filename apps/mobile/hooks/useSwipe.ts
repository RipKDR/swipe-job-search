import { supabase } from '@/lib/supabase';
import { performSwipe, type SwipeInput, type SwipeResult } from '@/lib/swipe';

/**
 * Hook wrapper (thin). Real logic in lib/swipe.ts for testability (no renderer dep).
 * Per plan: optimistic owned by caller (useJobDeck).
 */
export function useSwipe() {
  const swipe = async (input: SwipeInput): Promise<SwipeResult> => {
    return performSwipe(supabase, input);
  };

  return { swipe };
}
