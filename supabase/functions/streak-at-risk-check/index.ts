/**
 * streak-at-risk-check Edge Function
 *
 * Cron-triggered function that runs at 22:00 AEDT (11:00 UTC during DST, 12:00 UTC otherwise).
 * Queries streaks where last_swipe_date < today AND current_streak >= 1,
 * and sends Expo push notifications to those users whose streak is at risk.
 *
 * @see /plans/streak-jordan-handoff.md §5
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.106.2';

// ─── Types ────────────────────────────────────────────────────────────────

interface AtRiskStreak {
  user_id: string;
  current_streak: number;
  todaySwipes: number;
  device_tokens?: string[];
  streak_reminder_enabled?: boolean;
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

serve(async (_req: Request) => {
  const startTime = Date.now();

  try {
    // 1. Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD UTC

    // 2. Query users with active streaks that haven't swiped today
    const { data: atRiskUsers, error: queryError } = await supabase
      .from('streaks')
      .select(`
        user_id,
        current_streak,
        last_swipe_date
      `)
      .lt('last_swipe_date', today)
      .gte('current_streak', 1);

    if (queryError) {
      console.error('[streak-at-risk-check] query error:', queryError.message);
      return new Response(JSON.stringify({ sent: 0, errors: 1, error: queryError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!atRiskUsers || atRiskUsers.length === 0) {
      console.log('[streak-at-risk-check] no at-risk users found');
      return new Response(JSON.stringify({ sent: 0, errors: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[streak-at-risk-check] found ${atRiskUsers.length} at-risk users`);

    // 3. For each user, determine today's swipe count
    const notificationsToSend: Array<{
      userId: string;
      currentStreak: number;
      remainingSwipes: number;
      tokens: string[];
    }> = [];

    for (const streak of atRiskUsers) {
      // Get today's swipe count
      const { count: todaySwipes } = await supabase
        .from('swipes')
        .select('*', { count: 'exact', head: true })
        .eq('candidate_id', streak.user_id)
        .gte('created_at', `${today}T00:00:00Z`)
        .lt('created_at', `${today}T23:59:59Z`);

      const swipeCount = todaySwipes ?? 0;
      const remainingSwipes = Math.max(0, 5 - swipeCount);

      // Skip if they already have enough swipes
      if (swipeCount >= 5) continue;

      // Fetch device tokens and notification preferences
      const { data: deviceTokens } = await supabase
        .from('device_tokens')
        .select('token')
        .eq('user_id', streak.user_id);

      if (!deviceTokens || deviceTokens.length === 0) continue;

      // Check notification preferences (opt-out)
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('streak_reminder')
        .eq('user_id', streak.user_id)
        .single();

      if (prefs && prefs.streak_reminder === false) continue;

      const tokens = deviceTokens.map((t: { token: string }) => t.token);

      notificationsToSend.push({
        userId: streak.user_id,
        currentStreak: streak.current_streak,
        remainingSwipes,
        tokens,
      });
    }

    // 4. Send Expo push notifications in batches of 100
    let sentCount = 0;
    let errorCount = 0;

    for (const notification of notificationsToSend) {
      const messages = notification.tokens.map((token) => ({
        to: token,
        title: '🔥 Streak at risk!',
        body: `You need ${notification.remainingSwipes} more swipe${notification.remainingSwipes !== 1 ? 's' : ''} to keep your ${notification.currentStreak}-day streak. Midnight is soon!`,
        data: {
          type: 'streak_at_risk',
          remainingSwipes: notification.remainingSwipes,
          currentStreak: notification.currentStreak,
          deepLink: 'hi-hired://deck',
        },
        sound: 'default' as const,
        priority: 'normal' as const,
      }));

      // Send in chunks of 100
      for (let i = 0; i < messages.length; i += 100) {
        const chunk = messages.slice(i, i + 100);
        try {
          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chunk),
          });
          if (response.ok) {
            sentCount += chunk.length;
          } else {
            errorCount += chunk.length;
            console.error('[streak-at-risk-check] push API error:', response.statusText);
          }
        } catch (pushError) {
          errorCount += chunk.length;
          console.error('[streak-at-risk-check] push send failed:', pushError);
        }
      }

      // Log PostHog event for each user
      await capturePostHog('streak_at_risk_notification_sent', {
        user_id: notification.userId,
        current_streak: notification.currentStreak,
        time_to_midnight_minutes: 120,
        notifications_enabled: true,
      });
    }

    const elapsed = Date.now() - startTime;
    console.log(`[streak-at-risk-check] completed in ${elapsed}ms. Sent: ${sentCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({ sent: sentCount, errors: errorCount }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('[streak-at-risk-check] unhandled error:', err);
    return new Response(JSON.stringify({ sent: 0, errors: 1, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
