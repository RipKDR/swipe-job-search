/**
 * Notification Processor Edge Function
 *
 * Processes pending notifications from the queue and sends push via Expo.
 *
 * Triggered by cron (every 1 min) or manual HTTP POST with optional { queue_id: uuid }.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN')

type NotificationType =
  | 'interest_received'
  | 'match_created'
  | 'message_received'
  | 'hire_confirmed'

type NotificationStatus = 'pending' | 'sent' | 'failed'

interface NotificationQueueRow {
  id: string
  type: NotificationType
  payload: Record<string, unknown>
  status: NotificationStatus
  attempts: number
  created_at: string
}

interface InterestPayload {
  employer_id: string
  job_id: string
}

interface MatchPayload {
  match_id: string
  candidate_id: string
  employer_id: string
  job_id: string
}

interface MessagePayload {
  recipient_id: string
  match_id: string
  preview: string
}

interface HirePayload {
  candidate_id: string
  employer_id: string
  job_id: string
}

interface PushMessage {
  title: string
  body: string
  data: Record<string, string>
}

interface DeviceTokenRow {
  expo_push_token: string
}

interface JobTitleRow {
  title: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key]
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing or invalid payload field: ${key}`)
  }
  return value
}

function parseInterestPayload(payload: Record<string, unknown>): InterestPayload {
  return {
    employer_id: readString(payload, 'employer_id'),
    job_id: readString(payload, 'job_id'),
  }
}

function parseMatchPayload(payload: Record<string, unknown>): MatchPayload {
  return {
    match_id: readString(payload, 'match_id'),
    candidate_id: readString(payload, 'candidate_id'),
    employer_id: readString(payload, 'employer_id'),
    job_id: readString(payload, 'job_id'),
  }
}

function parseMessagePayload(payload: Record<string, unknown>): MessagePayload {
  return {
    recipient_id: readString(payload, 'recipient_id'),
    match_id: readString(payload, 'match_id'),
    preview: readString(payload, 'preview'),
  }
}

function parseHirePayload(payload: Record<string, unknown>): HirePayload {
  return {
    candidate_id: readString(payload, 'candidate_id'),
    employer_id: readString(payload, 'employer_id'),
    job_id: readString(payload, 'job_id'),
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
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

    for (const notif of (notifications ?? []) as NotificationQueueRow[]) {
      try {
        if (!isRecord(notif.payload)) {
          throw new Error(`Invalid payload for notification ${notif.id}`)
        }

        switch (notif.type) {
          case 'interest_received':
            await sendInterestNotification(supabase, parseInterestPayload(notif.payload))
            break
          case 'match_created':
            await sendMatchNotification(supabase, parseMatchPayload(notif.payload))
            break
          case 'message_received':
            await sendMessageNotification(supabase, parseMessagePayload(notif.payload))
            break
          case 'hire_confirmed':
            await sendHireNotification(supabase, parseHirePayload(notif.payload))
            break
          default:
            throw new Error(`Unknown notification type: ${notif.type}`)
        }

        await supabase
          .from('notification_queue')
          .update({ status: 'sent', processed_at: new Date().toISOString() })
          .eq('id', notif.id)

        processed++
      } catch (err) {
        console.error(`Failed to process ${notif.id}:`, err)

        await supabase
          .from('notification_queue')
          .update({
            attempts: notif.attempts + 1,
            last_error: errorMessage(err),
            status: notif.attempts + 1 >= 3 ? 'failed' : 'pending',
          })
          .eq('id', notif.id)

        failed++
      }
    }

    return new Response(JSON.stringify({ processed, failed }), {
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
  payload: InterestPayload
) {
  const jobTitle = await getJobTitle(supabase, payload.job_id)

  await sendPushToUser(supabase, payload.employer_id, {
    title: 'New Interest!',
    body: `Someone's interested in ${jobTitle || 'your job'}`,
    data: { type: 'interest', job_id: payload.job_id },
  })
}

async function sendMatchNotification(
  supabase: SupabaseClient,
  payload: MatchPayload
) {
  const jobTitle = await getJobTitle(supabase, payload.job_id)

  await sendPushToUser(supabase, payload.candidate_id, {
    title: "It's a match!",
    body: `You matched for ${jobTitle || 'a job'}`,
    data: { type: 'match', match_id: payload.match_id },
  })

  await sendPushToUser(supabase, payload.employer_id, {
    title: 'New Match',
    body: `Candidate matched for ${jobTitle || 'your job'}`,
    data: { type: 'match', match_id: payload.match_id },
  })
}

async function sendMessageNotification(
  supabase: SupabaseClient,
  payload: MessagePayload
) {
  await sendPushToUser(supabase, payload.recipient_id, {
    title: 'New Message',
    body: payload.preview,
    data: { type: 'message', match_id: payload.match_id },
  })
}

async function sendHireNotification(
  supabase: SupabaseClient,
  payload: HirePayload
) {
  const jobTitle = await getJobTitle(supabase, payload.job_id)

  await sendPushToUser(supabase, payload.candidate_id, {
    title: 'Hired! 🎉',
    body: `You're hired for ${jobTitle || 'the job'}!`,
    data: { type: 'hire', job_id: payload.job_id },
  })

  await sendPushToUser(supabase, payload.employer_id, {
    title: 'Hire Confirmed',
    body: `Hire confirmed for ${jobTitle || 'your job'}`,
    data: { type: 'hire', job_id: payload.job_id },
  })
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

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(EXPO_ACCESS_TOKEN && { Authorization: `Bearer ${EXPO_ACCESS_TOKEN}` }),
    },
    body: JSON.stringify(
      expoPushTokens.map((token) => ({
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
