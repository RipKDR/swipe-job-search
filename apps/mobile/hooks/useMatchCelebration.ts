import { useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { usePostHog } from '@/hooks/usePostHog';

/**
 * useMatchCelebration
 * Triggers celebration overlay + push notification on mutual match.
 * Wires to existing useCreateMatch without duplicating match logic.
 *
 * Source: Expo Notifications docs (https://docs.expo.dev/versions/latest/sdk/notifications/)
 * + PostHog event for match_made funnel.
 */
export interface MatchCelebrationState {
  isVisible: boolean;
  matchedJob: { id: string; title: string; company: string } | null;
}

export function useMatchCelebration() {
  const [state, setState] = useState<MatchCelebrationState>({
    isVisible: false,
    matchedJob: null,
  });
  const posthog = usePostHog();

  const triggerCelebration = useCallback(async (job: { id: string; title: string; company: string }) => {
    setState({ isVisible: true, matchedJob: job });

    // PostHog event (existing pattern in useJobDeck)
    posthog.capture('match_made', {
      job_id: job.id,
      job_title: job.title,
    });

    // Schedule local notification (graceful if permission not granted)
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'It\'s a match!',
          body: `You and ${job.company} both swiped right on ${job.title}.`,
          data: { jobId: job.id },
        },
        trigger: null, // immediate
      });
    } catch {
      // notification permission not granted or error — silent fail
    }
  }, [posthog]);

  const dismissCelebration = useCallback(() => {
    setState({ isVisible: false, matchedJob: null });
  }, []);

  return {
    ...state,
    triggerCelebration,
    dismissCelebration,
  };
}
