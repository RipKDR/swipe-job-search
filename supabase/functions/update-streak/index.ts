/**
 * update-streak Edge Function
 *
 * Fire-and-forget handler called from the frontend via supabase.functions.invoke().
 * Counts today's swipes for the user and upserts the streak row if the threshold (5) is met.
 *
 * Returns 200 with result data (including milestone detection) so the
 * frontend can optimistically update UI. Clients treat responses as non-critical.
 *
 * Designed to be idempotent: duplicate calls for the same day are safe (noop_same_day).
 *
 * @see /plans/streak-jordan-handoff.md §4
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.106.2';

// ─── Types ────────────────────────────────────────────────────────────────

interface UpdateStreakRequest {
  user_id: string;
  swipe_timestamp: string; // ISO 8601
}

interface UpsertStreakResult {
  action: 'created' | 'incremented' | 'reset' | 'noop_same_day';
  current_streak: number;
  longest_streak: number;
  last_swipe_date: string;
}

// ─── PostHog helper ───────────────────────────────────────────────────────

async function capturePostHog(
  event: string,
  properties: Record<string, unknown>,
): Promise<void> {
  const posthogHost = Deno.env.get('POSTHOG_HOST');
  const posthogKey = Deno.env.get('POSTHOG_API_KEY');
  if (!posthogHost || !posthogKey) return;

  try {
    await fetch(`${posthogHost}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: posthogKey,
        event,
        properties: {
          ...properties,
          $lib: 'supabase-edge-function',
        },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error('[posthog] capture failed:', err);
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const startTime = Date.now();

  try {
    // 1. Parse request
    const body: UpdateStreakRequest = await req.json();
    const { user_id, swipe_timestamp } = body;

    if (!user_id || !swipe_timestamp) {
      return new Response(JSON.stringify({ error: 'Missing user_id or swipe_timestamp' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Create Supabase admin client (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Extract UTC date from swipe_timestamp
    const todayDate = new Date(swipe_timestamp).toISOString().split('T')[0]; // YYYY-MM-DD UTC

    // 4. Count today's swipes for this user
    const { count: todaySwipes, error: countError } = await supabase
      .from('swipes')
      .select('*', { count: 'exact', head: true })
      .eq('candidate_id', user_id)
      .gte('created_at', `${todayDate}T00:00:00Z`)
      .lt('created_at', `${todayDate}T23:59:59Z`);

    const swipeCount = todaySwipes ?? 0;

    if (countError) {
      console.error('[update-streak] count query error:', countError.message);
      return new Response(JSON.stringify({ action: 'error', current_streak: 0, longest_streak: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. Build response object
    const result: Record<string, unknown> = {
      action: 'noop_same_day',
      current_streak: 0,
      longest_streak: 0,
      swipe_count_today: swipeCount,
    };

    // 6. Only proceed if threshold is met
    if (swipeCount >= 5) {
      const { data: streakResult, error: rpcError } = await supabase
        .rpc('upsert_streak', {
          p_user_id: user_id,
          p_today_date: todayDate,
        });

      if (rpcError) {
        console.error('[update-streak] upsert_streak RPC error:', rpcError.message);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const upsertResult = streakResult as unknown as UpsertStreakResult;

      result.action = upsertResult.action;
      result.current_streak = upsertResult.current_streak;
      result.longest_streak = upsertResult.longest_streak;

      // 7. Handle milestone detection
      const isMilestoneDay =
        upsertResult.action === 'incremented' &&
        [7, 14, 21, 30, 60, 90].includes(upsertResult.current_streak);

      if (isMilestoneDay) {
        // Sync streak to profile for badge/display count
        const { error: syncError } = await supabase.rpc('sync_streak_to_profile', {
          p_user_id: user_id,
          p_current_streak: upsertResult.current_streak,
          p_longest_streak: upsertResult.longest_streak,
        });

        if (syncError) {
          console.error('[update-streak] sync_streak_to_profile error:', syncError.message);
        }

        // Send PostHog event
        const rewardClaimed =
          upsertResult.current_streak === 7
            ? 'super_applies'
            : upsertResult.current_streak === 30
              ? 'badge'
              : null;

        await capturePostHog('streak_milestone_reached', {
          streak_length: upsertResult.current_streak,
          user_id,
          reward_claimed: rewardClaimed,
          current_streak_after: upsertResult.current_streak,
        });

        // Indicate milestone to the frontend
        result.milestone_detected = true;
        result.milestone_day = upsertResult.current_streak;
      }

      // 8. Handle streak broken event
      if (upsertResult.action === 'reset') {
        await capturePostHog('streak_broken', {
          previous_length: 0,
          days_since_last_swipe: 0,
          longest_streak: upsertResult.longest_streak,
        });
      }

      // 9. Log streak saved event
      await capturePostHog('streak_saved', {
        user_id,
        was_at_risk: false,
        current_streak: upsertResult.current_streak,
      });
    }

    const elapsed = Date.now() - startTime;
    console.log(`[update-streak] completed in ${elapsed}ms for user ${user_id}`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[update-streak] unhandled error:', err);
    return new Response(JSON.stringify({ action: 'error' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
