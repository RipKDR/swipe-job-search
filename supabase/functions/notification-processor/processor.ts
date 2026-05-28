/**
 * Pure notification processor logic — testable without Deno serve/Supabase.
 */

export const MAX_ATTEMPTS = 3

export type NotificationType =
  | 'interest_received'
  | 'match_created'
  | 'message_received'
  | 'hire_confirmed'

export type NotificationStatus = 'pending' | 'processing' | 'sent' | 'failed'

export interface PushMessage {
  title: string
  body: string
  data: Record<string, string>
}

export interface InterestPayload {
  employer_id: string
  job_id: string
}

export interface MatchPayload {
  match_id: string
  candidate_id: string
  employer_id: string
  job_id: string
}

export interface MessagePayload {
  recipient_id: string
  match_id: string
  preview: string
}

export interface HirePayload {
  candidate_id: string
  employer_id: string
  job_id: string
}

export interface ExpoTicket {
  status: string
  id?: string
  message?: string
  details?: { error?: string }
}

export interface FailureUpdate {
  attempts: number
  last_error: string
  status: 'pending' | 'failed'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function readString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key]
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing or invalid payload field: ${key}`)
  }
  return value
}

export function parseInterestPayload(payload: Record<string, unknown>): InterestPayload {
  return {
    employer_id: readString(payload, 'employer_id'),
    job_id: readString(payload, 'job_id'),
  }
}

export function parseMatchPayload(payload: Record<string, unknown>): MatchPayload {
  return {
    match_id: readString(payload, 'match_id'),
    candidate_id: readString(payload, 'candidate_id'),
    employer_id: readString(payload, 'employer_id'),
    job_id: readString(payload, 'job_id'),
  }
}

export function parseMessagePayload(payload: Record<string, unknown>): MessagePayload {
  return {
    recipient_id: readString(payload, 'recipient_id'),
    match_id: readString(payload, 'match_id'),
    preview: readString(payload, 'preview'),
  }
}

export function parseHirePayload(payload: Record<string, unknown>): HirePayload {
  return {
    candidate_id: readString(payload, 'candidate_id'),
    employer_id: readString(payload, 'employer_id'),
    job_id: readString(payload, 'job_id'),
  }
}

export function buildInterestPushMessage(
  jobTitle: string | null,
  _payload: InterestPayload
): PushMessage {
  const title = jobTitle || 'your job'
  return {
    title: 'New Interest!',
    body: `Someone's interested in ${title}`,
    data: { type: 'interest', job_id: _payload.job_id },
  }
}

export function buildMatchPushMessages(
  jobTitle: string | null,
  payload: MatchPayload
): { candidate: PushMessage; employer: PushMessage } {
  const title = jobTitle || 'a job'
  return {
    candidate: {
      title: 'Employer wants to chat',
      body: `An employer wants to chat about ${title}`,
      data: { type: 'match', match_id: payload.match_id },
    },
    employer: {
      title: 'New Match',
      body: `Candidate matched for ${jobTitle || 'your job'}`,
      data: { type: 'match', match_id: payload.match_id },
    },
  }
}

export function buildMessagePushMessage(payload: MessagePayload): PushMessage {
  return {
    title: 'New Message',
    body: payload.preview,
    data: { type: 'message', match_id: payload.match_id },
  }
}

export function buildHirePushMessages(
  jobTitle: string | null,
  payload: HirePayload
): { candidate: PushMessage; employer: PushMessage } {
  const title = jobTitle || 'the job'
  const employerTitle = jobTitle || 'your job'
  return {
    candidate: {
      title: 'Hired! 🎉',
      body: `You're hired for ${title}!`,
      data: { type: 'hire', job_id: payload.job_id },
    },
    employer: {
      title: 'Hire Confirmed',
      body: `Hire confirmed for ${employerTitle}`,
      data: { type: 'hire', job_id: payload.job_id },
    },
  }
}

export function parseExpoPushResponse(
  response: { ok: boolean; statusText: string },
  result: unknown
): ExpoTicket[] {
  if (!response.ok) {
    throw new Error(`Expo push failed: ${response.statusText}`)
  }

  if (!isRecord(result) || !Array.isArray(result.data)) {
    throw new Error('Expo push returned invalid response')
  }

  const tickets = result.data as ExpoTicket[]
  const errors = tickets.filter((ticket) => ticket.status === 'error')

  if (errors.length > 0) {
    const detail = errors.map((ticket) => ticket.message ?? ticket.details?.error ?? 'unknown').join('; ')
    throw new Error(`Expo push ticket error: ${detail}`)
  }

  return tickets
}

export function computeFailureUpdate(attempts: number, error: string): FailureUpdate {
  const nextAttempts = attempts + 1
  return {
    attempts: nextAttempts,
    last_error: error,
    status: nextAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
  }
}

export function shouldProcessNotification(status: NotificationStatus, attempts: number): boolean {
  return status === 'pending' && attempts < MAX_ATTEMPTS
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function validatePayload(payload: unknown, notificationId: string): Record<string, unknown> {
  if (!isRecord(payload)) {
    throw new Error(`Invalid payload for notification ${notificationId}`)
  }
  return payload
}

export function buildExpoPushRequests(
  tokens: string[],
  message: PushMessage
): Array<Record<string, unknown>> {
  return tokens.map((token) => ({
    to: token,
    title: message.title,
    body: message.body,
    data: message.data,
    sound: 'default',
    priority: 'high',
  }))
}
