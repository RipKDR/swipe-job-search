import * as Haptics from 'expo-haptics';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@hi-hired/shared';

export interface SwipeInput {
  candidateId: string;
  jobId: string;
  direction: 'left' | 'right';
}

export interface SwipeResult {
  success: boolean;
}

export function mapSwipeError(error: { message?: string } | null): string {
  const message = error?.message ?? '';
  if (message.includes('RATE_LIMIT_EXCEEDED')) {
    return 'Too many swipes — try again in a minute';
  }
  return message || 'Unable to save swipe right now';
}

/**
 * Core swipe persistence + haptics (pure, injectable deps for TDD).
 * Used by useSwipe hook. Tested without React renderer.
 */
export async function performSwipe(
  supabase: SupabaseClient<Database>,
  { candidateId, jobId, direction }: SwipeInput
): Promise<SwipeResult> {
  await Haptics.selectionAsync();

  const { error } = await (supabase as any)
    .from('swipes')
    .upsert(
      [{ candidate_id: candidateId, job_id: jobId, direction }],
      { onConflict: 'candidate_id,job_id' }
    );

  if (error) {
    throw new Error(mapSwipeError(error));
  }

  if (direction === 'right') {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  return { success: true };
}
