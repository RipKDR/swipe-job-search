import { Platform } from 'react-native';
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

function mapSwipeError(error: { message?: string } | null): string {
  const message = error?.message ?? '';
  if (message.includes('RATE_LIMIT_EXCEEDED')) {
    return 'Too many swipes — try again in a minute';
  }
  return message || 'Unable to save swipe right now';
}

// Haptics — no-op on web, native on device, respects user preference
async function triggerHaptic(type?: 'selection' | 'success' | 'warning') {
  if (Platform.OS === 'web') return;
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const enabled = await AsyncStorage.getItem('settings_haptics_enabled');
    if (enabled === 'false') return;

    if (type === 'selection') {
      await Haptics.selectionAsync();
    } else if (type === 'success') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (type === 'warning') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  } catch {
    // Haptics not available
  }
}

/**
 * Core swipe persistence + haptics (pure, injectable deps for TDD).
 * Used by useSwipe hook. Tested without React renderer.
 */
export async function performSwipe(
  supabase: SupabaseClient<Database>,
  { candidateId, jobId, direction }: SwipeInput
): Promise<SwipeResult> {
  await triggerHaptic('selection');

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
    await triggerHaptic('success');
  } else {
    await triggerHaptic('warning');
  }

  return { success: true };
}
