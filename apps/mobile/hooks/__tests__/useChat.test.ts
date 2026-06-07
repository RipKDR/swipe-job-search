import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ChatMessage } from '../useChat'

const mockFrom = vi.fn()
const mockChannel = vi.fn()
const mockRemoveChannel = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}))

function setupFromChain(result: { data?: unknown; error?: unknown; count?: number }) {
  const insertChain = {
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  }
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnValue(insertChain),
    single: vi.fn().mockResolvedValue(result),
  }
  chain.select.mockImplementation(() => chain)
  chain.eq.mockImplementation(() => chain)
  chain.order.mockImplementation(() => chain)
  chain.range.mockImplementation(() => Promise.resolve(result))
  insertChain.select.mockImplementation(() => insertChain)
  mockFrom.mockReturnValue(chain)
  return chain
}

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChannel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })
  })

  it('canSendMessage allows chatting and hire_pending', async () => {
    const { canSendMessage } = await import('../useChat')

    expect(canSendMessage('chatting')).toBe(true)
    expect(canSendMessage('hire_pending')).toBe(true)
    expect(canSendMessage('unmatched')).toBe(false)
    expect(canSendMessage('hired')).toBe(false)
  })

  it('sendMessage inserts when match status allows messaging', async () => {
    const chain = setupFromChain({
      data: {
        id: 'msg-1',
        match_id: 'match-1',
        sender_id: 'user-1',
        body: 'Hello',
        created_at: '2026-05-28T00:00:00Z',
        read_at: null,
      },
      error: null,
    })

    const { sendMessage } = await import('../useChat')
    const result = await sendMessage({
      matchId: 'match-1',
      senderId: 'user-1',
      body: 'Hello',
      matchStatus: 'chatting',
    })

    expect(mockFrom).toHaveBeenCalledWith('messages')
    expect(chain.insert).toHaveBeenCalledWith({
      match_id: 'match-1',
      sender_id: 'user-1',
      body: 'Hello',
    })
    expect(result.body).toBe('Hello')
  })

  it('edge: message blocked when match status is unmatched', async () => {
    const { sendMessage } = await import('../useChat')

    await expect(
      sendMessage({
        matchId: 'match-1',
        senderId: 'user-1',
        body: 'Hello',
        matchStatus: 'unmatched',
      })
    ).rejects.toThrow('Messaging is not available for this match')
  })

  it('AE3: realtime handler appends incoming message', async () => {
    const { applyRealtimeMessage } = await import('../useChat')

    const existing: ChatMessage[] = [
      {
        id: 'msg-1',
        match_id: 'match-1',
        sender_id: 'user-1',
        body: 'Hi',
        created_at: '2026-05-28T00:00:00Z',
        read_at: null,
      },
    ]

    const incoming: ChatMessage = {
      id: 'msg-2',
      match_id: 'match-1',
      sender_id: 'user-2',
      body: 'Hey there',
      created_at: '2026-05-28T00:01:00Z',
      read_at: null,
    }

    const next = applyRealtimeMessage(existing, incoming)

    expect(next).toHaveLength(2)
    expect(next[1].body).toBe('Hey there')
  })

  it('AE3: realtime handler deduplicates by message id', async () => {
    const { applyRealtimeMessage } = await import('../useChat')

    const existing: ChatMessage[] = [
      {
        id: 'msg-1',
        match_id: 'match-1',
        sender_id: 'user-1',
        body: 'Hi',
        created_at: '2026-05-28T00:00:00Z',
        read_at: null,
      },
    ]

    const duplicate: ChatMessage = {
      id: 'msg-1',
      match_id: 'match-1',
      sender_id: 'user-1',
      body: 'Hi',
      created_at: '2026-05-28T00:00:00Z',
      read_at: null,
    }

    const next = applyRealtimeMessage(existing, duplicate)

    expect(next).toHaveLength(1)
  })

  it('fetchMessages queries match history ordered by created_at', async () => {
    const chain = setupFromChain({
      data: [
        {
          id: 'msg-1',
          match_id: 'match-1',
          sender_id: 'user-1',
          body: 'Hi',
          created_at: '2026-05-28T00:00:00Z',
          read_at: null,
        },
      ],
      error: null,
    })

    const { fetchMessages } = await import('../useChat')
    const messages = await fetchMessages('match-1')

    expect(mockFrom).toHaveBeenCalledWith('messages')
    expect(chain.eq).toHaveBeenCalledWith('match_id', 'match-1')
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: true })
    expect(messages).toHaveLength(1)
  })
})
