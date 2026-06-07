/**
 * useShareJob — Share a job card via the native Share API.
 *
 * Flow:
 *   1. Calls record_share_event RPC (validates rate limit, generates share_token)
 *   2. Builds share text + URLs
 *   3. Opens native Share.share()
 *   4. Fires PostHog on successful share
 *
 * @see share-jordan-handoff.md §3.3
 */

import { useCallback, useState } from 'react';
import { Share, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { usePostHog } from '@/hooks/usePostHog';
import {
  SHARE_TEXT_TEMPLATES,
  buildJobShareUrl,
  formatJobTypeLabel,
} from '@/lib/share';
import type { Job } from '@hi-hired/shared';

// ─── Types ───────────────────────────────────────────────

export interface ShareJobParams {
  job: Job;
  sharerName?: string | null;
  source?: 'card' | 'detail';
}

export interface ShareJobResult {
  shared: boolean;
  /** True if user cancelled the native share sheet */
  cancelled?: boolean;
  error?: string;
}

// ─── Hook ────────────────────────────────────────────────

export function useShareJob() {
  const [isSharing, setIsSharing] = useState(false);
  const { user } = useAuth();
  const posthog = usePostHog();

  const shareJob = useCallback(
    async (params: ShareJobParams): Promise<ShareJobResult> => {
      const { job, sharerName, source = 'card' } = params;

      if (!job?.id || !user?.id) {
        return { shared: false, error: 'Missing job or user data' };
      }

      setIsSharing(true);

      try {
        // 1. Generate share_token via RPC (also validates rate limit)
        const { data: shareData, error: rpcError } = await (supabase as any).rpc(
          'record_share_event',
          {
            p_job_id: job.id,
            p_share_type: 'job',
          },
        );

        if (rpcError || !shareData?.allowed) {
          console.error('[useShareJob] RPC error:', rpcError || shareData?.error);
          posthog?.capture('share_job_rate_limited', {
            job_id: job.id,
            daily_count: shareData?.daily_share_count,
            source,
          });
          return {
            shared: false,
            error: shareData?.error || 'Failed to record share',
          };
        }

        const shareToken: string = (shareData as any).share_token;

        // 2. Build URLs and share text
        const urls = buildJobShareUrl(job.id, user.id, shareToken);
        const jobTypeLabel = formatJobTypeLabel(job.job_type ?? '');

        const shareText = SHARE_TEXT_TEMPLATES.job.message({
          title: job.title ?? '',
          payDisplay: job.pay_display ?? '',
          suburb: job.suburb ?? '',
          jobTypeLabel,
          sharerName,
          deepLink: urls.appDeepLink,
          webLink: urls.webFallback,
        });

        // 3. Open native share sheet
        const result = await Share.share(
          {
            title: SHARE_TEXT_TEMPLATES.job.title(job.title ?? ''),
            message:
              Platform.OS === 'android'
                ? `${shareText}\n\n${urls.webFallback}`
                : shareText,
            url: Platform.OS === 'ios' ? urls.webFallback : undefined,
          },
          {
            dialogTitle: SHARE_TEXT_TEMPLATES.job.dialogTitle,
            subject: SHARE_TEXT_TEMPLATES.job.subject(job.title ?? ''),
          },
        );

        const wasShared = result.action === Share.sharedAction;

        // 4. PostHog tracking
        if (wasShared) {
          posthog?.capture('job_shared', {
            job_id: job.id,
            source,
            share_token: shareToken,
            employer_id: job.employer_id,
            channel: null,
          });
        } else {
          // User dismissed — still record the RPC call was made but share not completed
          posthog?.capture('share_job_dismissed', {
            job_id: job.id,
            source,
          });
        }

        return {
          shared: wasShared,
          cancelled: result.action === Share.dismissedAction,
        };
      } catch (error) {
        console.error('[useShareJob] Error:', error);
        posthog?.capture('share_error', {
          job_id: job.id,
          error: String(error),
          source,
        });
        return { shared: false, error: String(error) };
      } finally {
        setIsSharing(false);
      }
    },
    [user, posthog],
  );

  return { shareJob, isSharing };
}
