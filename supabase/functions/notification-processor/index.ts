/**
 * Notification Processor Edge Function
 * 
 * Processes pending notifications from the queue and sends:
 * - Push notifications via Expo
 * - Email fallback via Resend (if push fails/unopened after 2h)
 * 
 * Triggered by:
 * - Cron: every 1 minute
 * - Manual: HTTP POST with optional { queue_id: uuid }
 * 
 * Idempotency: Unique idempotency_key on queue insert prevents duplicates
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN')

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const body = await req.json().catch(() => ({}))
    const queueId = body.queue_id

    // Fetch pending notifications (up to 50 per batch)
    let query = supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 3)
      .order('created_at', { ascending: true })
      .limit(50)

    if (queueId) {
      query = query.eq('id', queueId)
    }

    const { data: notifications, error } = await query

    if (error) {
      throw error
    }

    let processed = 0
    let failed = 0

    for (const notif of notifications || []) {
      try {
        // Route based on notification type
        switch (notif.type) {
          case 'interest_received':
            await sendInterestNotification(supabase, notif)
            break
          case 'match_created':
            await sendMatchNotification(supabase, notif)
            break
          case 'message_received':
            await sendMessageNotification(supabase, notif)
            break
          case 'hire_confirmed':
            await sendHireNotification(supabase, notif)
            break
          default:
            console.warn(`Unknown notification type: ${notif.type}`)
        }

        // Mark as sent
        await supabase
          .from('notification_queue')
          .update({ status: 'sent', processed_at: new Date().toISOString() })
          .eq('id', notif.id)

        processed++
      } catch (err) {
        console.error(`Failed to process ${notif.id}:`, err)

        // Increment attempts
        await supabase
          .from('notification_queue')
          .update({
            attempts: notif.attempts + 1,
            last_error: err.message,
            status: notif.attempts + 1 >= 3 ? 'failed' : 'pending',
          })
          .eq('id', notif.id)

        failed++
      }
    }

    return new Response(
      JSON.stringify({ processed, failed }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Notification processor error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

async function sendInterestNotification(supabase: any, notif: any) {
  const { employer_id, job_id } = notif.payload
  const { data: job } = await supabase
    .from('jobs')
    .select('title')
    .eq('id', job_id)
    .single()

  await sendPushToUser(supabase, employer_id, {
    title: 'New Interest!',
    body: `Someone's interested in ${job?.title || 'your job'}`,
    data: { type: 'interest', job_id },
  })
}

async function sendMatchNotification(supabase: any, notif: any) {
  const { match_id, candidate_id, employer_id, job_id } = notif.payload

  const { data: job } = await supabase
    .from('jobs')
    .select('title')
    .eq('id', job_id)
    .single()

  // Push to candidate
  await sendPushToUser(supabase, candidate_id, {
    title: "It's a match!",
    body: `You matched for ${job?.title || 'a job'}`,
    data: { type: 'match', match_id },
  })

  // Push to employer
  await sendPushToUser(supabase, employer_id, {
    title: 'New Match',
    body: `Candidate matched for ${job?.title || 'your job'}`,
    data: { type: 'match', match_id },
  })
}

async function sendMessageNotification(supabase: any, notif: any) {
  const { recipient_id, match_id, preview } = notif.payload

  await sendPushToUser(supabase, recipient_id, {
    title: 'New Message',
    body: preview,
    data: { type: 'message', match_id },
  })
}

async function sendHireNotification(supabase: any, notif: any) {
  const { candidate_id, employer_id, job_id } = notif.payload

  const { data: job } = await supabase
    .from('jobs')
    .select('title')
    .eq('id', job_id)
    .single()

  // Push to both parties
  await sendPushToUser(supabase, candidate_id, {
    title: 'Hired! 🎉',
    body: `You're hired for ${job?.title || 'the job'}!`,
    data: { type: 'hire', job_id },
  })

  await sendPushToUser(supabase, employer_id, {
    title: 'Hire Confirmed',
    body: `Hire confirmed for ${job?.title || 'your job'}`,
    data: { type: 'hire', job_id },
  })
}

async function sendPushToUser(supabase: any, userId: string, message: any) {
  // Fetch device tokens
  const { data: tokens } = await supabase
    .from('device_tokens')
    .select('expo_push_token')
    .eq('profile_id', userId)

  if (!tokens || tokens.length === 0) {
    console.log(`No device tokens for user ${userId}`)
    return
  }

  // Send via Expo Push API
  const expoPushTokens = tokens.map((t: any) => t.expo_push_token)

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(EXPO_ACCESS_TOKEN && { 'Authorization': `Bearer ${EXPO_ACCESS_TOKEN}` }),
    },
    body: JSON.stringify(
      expoPushTokens.map((token: string) => ({
        to: token,
        title: message.title,
        body: message.body,
        data: message.data,
        sound: 'default',
        priority: 'high',
      }))
    ),
  })

  if (!response.ok) {
    throw new Error(`Expo push failed: ${response.statusText}`)
  }

  const result = await response.json()
  console.log('Expo push result:', result)
}
