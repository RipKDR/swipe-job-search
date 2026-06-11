/**
 * useInviteFriend — Share referral code via native Share API.
 *
 * Fetches or generates a referral code via RPC, builds invite text,
 * and opens the native share sheet. Tracks with PostHog on success.
 *
 * @see share-jordan-handoff.md §3.4
 */

import { useCallback, useState } from 'react';
import { Share, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { usePostHog } from '@/hooks/usePostHog';
import {
  SHARE_TEXT_TEMPLATES,
  buildInviteShareUrl,
} from '@/lib/share';
import { useQuery , useMutation, useQueryClient } from '@tanstack/react-query';

// Follow existing pattern: use `as any` for tables/RPCs not yet in Database types
 
const sb = supabase as any;

// ─── Hook ────────────────────────────────────────────────

export function useInviteFriend() {
  const [isSharing, setIsSharing] = useState(false);
  const { user, profile } = useAuth();
  const posthog = usePostHog();
  const queryClient = useQueryClient();

  // Fetch referral code (lazy generation via RPC)
  const {
    data: referralCode,
    isLoading: isLoadingCode,
    error: codeError,
    refetch: refetchCode,
  } = useQuery<string | null>({
    queryKey: ['referral-code', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await sb.rpc('generate_referral_code');
      if (error) throw error;
      return data as string;
    },
    enabled: Boolean(user?.id),
    staleTime: Infinity, // code never changes after generation
    retry: 2,
  });

  // Mutation for generating code on demand
  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await sb.rpc('generate_referral_code');
      if (error) throw error;
      return data as string;
    },
    onSuccess: (code) => {
      queryClient.setQueryData(['referral-code', user?.id], code);
    },
  });

  const inviteFriend = useCallback(async (): Promise<void> => {
    if (!user?.id) return;
    setIsSharing(true);

    try {
      // 1. Get or generate referral code
      let code = referralCode;
      if (!code) {
        const result = await generateMutation.mutateAsync();
        code = result;
      }

      if (!code) {
        // Fallback: share generic app link
        await Share.share({
          title: 'Join me on Hi-Hired',
          message: 'Find local work on Hi-Hired! https://hihired.app/download',
        });
        return;
      }

      const urls = buildInviteShareUrl(code, user.id);

      // 2. Build share message
      const sharerName =
        profile?.full_name ?? user.email?.split('@')[0] ?? null;

      const shareText = SHARE_TEXT_TEMPLATES.invite.message({
        sharerName,
        referralCode: code,
        deepLink: urls.appDeepLink,
        webLink: urls.webFallback,
      });

      // 3. Open native share sheet
      const result = await Share.share(
        {
          title: SHARE_TEXT_TEMPLATES.invite.title,
          message: Platform.OS === 'android'
            ? `${shareText}\n\n${urls.webFallback}`
            : shareText,
          url: Platform.OS === 'ios' ? urls.webFallback : undefined,
        },
        {
          dialogTitle: SHARE_TEXT_TEMPLATES.invite.dialogTitle,
          subject: SHARE_TEXT_TEMPLATES.invite.subject,
        },
      );

      // 4. PostHog tracking
      if (result.action === Share.sharedAction) {
        posthog?.capture('invite_friend_shared', {
          referral_code: code,
          channel: null,
        });
      }
    } catch (error) {
      console.error('[useInviteFriend] Error:', error);
      posthog?.capture('invite_friend_error', { error: String(error) });
    } finally {
      setIsSharing(false);
    }
  }, [user, profile, referralCode, generateMutation, posthog]);

  return {
    referralCode,
    inviteFriend,
    isSharing,
    isLoadingCode,
    codeError,
    refetchCode,
  };
}
