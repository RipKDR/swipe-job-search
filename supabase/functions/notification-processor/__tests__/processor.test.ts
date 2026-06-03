import {
  buildMatchPushMessages,
  buildInterestPushMessage,
  buildMessagePushMessage,
  buildHirePushMessages,
  parseExpoPushResponse,
  computeFailureUpdate,
  shouldProcessNotification,
  MAX_ATTEMPTS,
} from '../processor.ts'

import { assertEquals, assertThrows } from 'https://deno.land/std@0.168.0/testing/asserts.ts'

Deno.test('buildMatchPushMessages uses employer-initiated copy for candidate', () => {
  const messages = buildMatchPushMessages('Barista', {
    match_id: 'm-1',
    candidate_id: 'c-1',
    employer_id: 'e-1',
    job_id: 'j-1',
  })

  assertEquals(messages.candidate.title, 'Employer wants to chat')
  assertEquals(messages.candidate.body, 'An employer wants to chat about Barista')
  assertEquals(messages.candidate.data, { type: 'match', match_id: 'm-1' })

  assertEquals(messages.employer.title, 'New Match')
  assertEquals(messages.employer.body, 'Candidate matched for Barista')
})

Deno.test('buildMatchPushMessages falls back when job title missing', () => {
  const messages = buildMatchPushMessages(null, {
    match_id: 'm-1',
    candidate_id: 'c-1',
    employer_id: 'e-1',
    job_id: 'j-1',
  })

  assertEquals(messages.candidate.body, 'An employer wants to chat about a job')
})

Deno.test('buildInterestPushMessage formats employer alert', () => {
  const message = buildInterestPushMessage('Retail Assistant', {
    employer_id: 'e-1',
    job_id: 'j-1',
  })

  assertEquals(message.title, 'New Interest!')
  assertEquals(message.body, "Someone's interested in Retail Assistant")
  assertEquals(message.data.type, 'interest')
})

Deno.test('buildMessagePushMessage includes preview and match route data', () => {
  const message = buildMessagePushMessage({
    recipient_id: 'u-1',
    match_id: 'm-1',
    preview: 'Hello there',
  })

  assertEquals(message.title, 'New Message')
  assertEquals(message.body, 'Hello there')
  assertEquals(message.data, { type: 'message', match_id: 'm-1' })
})

Deno.test('buildHirePushMessages notifies both parties', () => {
  const messages = buildHirePushMessages('Chef', {
    candidate_id: 'c-1',
    employer_id: 'e-1',
    job_id: 'j-1',
  })

  assertEquals(messages.candidate.title, 'Hired! 🎉')
  assertEquals(messages.employer.title, 'Hire Confirmed')
})

Deno.test('parseExpoPushResponse throws on HTTP failure', () => {
  assertThrows(
    () => parseExpoPushResponse({ ok: false, statusText: 'Bad Gateway' }, null),
    Error,
    'Expo push failed: Bad Gateway'
  )
})

Deno.test('parseExpoPushResponse throws on ticket errors', () => {
  assertThrows(
    () =>
      parseExpoPushResponse(
        { ok: true, statusText: 'OK' },
        {
          data: [{ status: 'error', message: 'DeviceNotRegistered', details: { error: 'DeviceNotRegistered' } }],
        }
      ),
    Error,
    'Expo push ticket error'
  )
})

Deno.test('parseExpoPushResponse accepts ok tickets', () => {
  const result = parseExpoPushResponse(
    { ok: true, statusText: 'OK' },
    { data: [{ status: 'ok', id: 'ticket-1' }] }
  )

  assertEquals(result, [{ status: 'ok', id: 'ticket-1' }])
})

Deno.test('computeFailureUpdate keeps pending below max attempts', () => {
  assertEquals(computeFailureUpdate(0, 'network'), {
    attempts: 1,
    last_error: 'network',
    status: 'pending',
  })
  assertEquals(computeFailureUpdate(1, 'network'), {
    attempts: 2,
    last_error: 'network',
    status: 'pending',
  })
})

Deno.test('computeFailureUpdate marks failed at max attempts', () => {
  assertEquals(computeFailureUpdate(MAX_ATTEMPTS - 1, 'network'), {
    attempts: MAX_ATTEMPTS,
    last_error: 'network',
    status: 'failed',
  })
})

Deno.test('shouldProcessNotification skips non-pending rows', () => {
  assertEquals(shouldProcessNotification('pending', 0), true)
  assertEquals(shouldProcessNotification('sent', 0), false)
  assertEquals(shouldProcessNotification('failed', 2), false)
  assertEquals(shouldProcessNotification('pending', MAX_ATTEMPTS), false)
})
