/**
 * Notification Processor Edge Function
 *
 * Processes pending notifications from the queue and sends push via Expo.
 * Always sends push — no Realtime presence suppression (ARCHITECTURE_AUDIT HIGH-1).
 *
 * Triggered by cron (every 1 min) or manual HTTP POST with optional { queue_id: uuid }.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  type NotificationType,
  type NotificationStatus,
  type PushMessage,
  buildExpoPushRequests,
  buildHirePushMessages,
  buildInterestPushMessage,
  buildMatchPushMessages,
  buildMessagePushMessage,
  computeFailureUpdate,
  errorMessage,
  parseExpoPushResponse,
  parseHirePayload,
  parseInterestPayload,
  parseMatchPayload,
  parseMessagePayload,
  shouldProcessNotification,
  validatePayload,
} from './processor.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN')

interface NotificationQueueRow {
  id: string
  type: NotificationType
  payload: Record<string, unknown>
  status: NotificationStatus
  attempts: number
  created_at: string
}

interface DeviceTokenRow {
  expo_push_token: string
}

interface JobTitleRow {
  title: string | null
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const body = await req.json().catch(() => ({}))
    const queueId = typeof body.queue_id === 'string' ? body.queue_id : undefined

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
    let skipped = 0

    for (const notif of (notifications ?? []) as NotificationQueueRow[]) {
      if (!shouldProcessNotification(notif.status, notif.attempts)) {
        skipped++
        continue
      }

      try {
        const payload = validatePayload(notif.payload, notif.id)

        switch (notif.type) {
          case 'interest_received':
            await sendInterestNotification(supabase, parseInterestPayload(payload))
            break
          case 'match_created':
            await sendMatchNotification(supabase, parseMatchPayload(payload))
            break
          case 'message_received':
            await sendMessageNotification(supabase, parseMessagePayload(payload))
            break
          case 'hire_confirmed':
            await sendHireNotification(supabase, parseHirePayload(payload))
            break
          default:
            throw new Error(`Unknown notification type: ${notif.type}`)
        }

        const { data: updated, error: updateError } = await supabase
          .from('notification_queue')
          .update({ status: 'sent', processed_at: new Date().toISOString() })
          .eq('id', notif.id)
          .eq('status', 'pending')
          .select('id')

        if (updateError) {
          throw updateError
        }

        if (!updated || updated.length === 0) {
          skipped++
          continue
        }

        processed++
      } catch (err) {
        console.error(`Failed to process ${notif.id}:`, err)

        const update = computeFailureUpdate(notif.attempts, errorMessage(err))
        await supabase
          .from('notification_queue')
          .update({
            attempts: update.attempts,
            last_error: update.last_error,
            status: update.status,
          })
          .eq('id', notif.id)
          .eq('status', 'pending')

        failed++
      }
    }

    return new Response(JSON.stringify({ processed, failed, skipped }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Notification processor error:', error)
    return new Response(JSON.stringify({ error: errorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

async function getJobTitle(
  supabase: SupabaseClient,
  jobId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('jobs')
    .select('title')
    .eq('id', jobId)
    .single()

  return (data as JobTitleRow | null)?.title ?? null
}

async function sendInterestNotification(
  supabase: SupabaseClient,
  payload: ReturnType<typeof parseInterestPayload>
) {
  const jobTitle = await getJobTitle(supabase, payload.job_id)
  await sendPushToUser(supabase, payload.employer_id, buildInterestPushMessage(jobTitle, payload))
}

async function sendMatchNotification(
  supabase: SupabaseClient,
  payload: ReturnType<typeof parseMatchPayload>
) {
  const jobTitle = await getJobTitle(supabase, payload.job_id)
  const messages = buildMatchPushMessages(jobTitle, payload)

  await sendPushToUser(supabase, payload.candidate_id, messages.candidate)
  await sendPushToUser(supabase, payload.employer_id, messages.employer)
}

async function sendMessageNotification(
  supabase: SupabaseClient,
  payload: ReturnType<typeof parseMessagePayload>
) {
  await sendPushToUser(supabase, payload.recipient_id, buildMessagePushMessage(payload))
}

async function sendHireNotification(
  supabase: SupabaseClient,
  payload: ReturnType<typeof parseHirePayload>
) {
  const jobTitle = await getJobTitle(supabase, payload.job_id)
  const messages = buildHirePushMessages(jobTitle, payload)

  await sendPushToUser(supabase, payload.candidate_id, messages.candidate)
  await sendPushToUser(supabase, payload.employer_id, messages.employer)
}

async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  message: PushMessage
) {
  const { data: tokens } = await supabase
    .from('device_tokens')
    .select('expo_push_token')
    .eq('profile_id', userId)

  if (!tokens || tokens.length === 0) {
    console.log(`No device tokens for user ${userId}`)
    return
  }

  const expoPushTokens = (tokens as DeviceTokenRow[]).map((token) => token.expo_push_token)
  await sendExpoPush(expoPushTokens, message)
}

async function sendExpoPush(tokens: string[], message: PushMessage) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(EXPO_ACCESS_TOKEN && { Authorization: `Bearer ${EXPO_ACCESS_TOKEN}` }),
    },
    body: JSON.stringify(buildExpoPushRequests(tokens, message)),
  })

  const result = await response.json()
  parseExpoPushResponse(response, result)
  console.log('Expo push result:', result)
}
