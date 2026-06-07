import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export type ChatMessage = {
  id: string
  match_id: string
  sender_id: string
  body: string
  created_at: string
  read_at: string | null
}

export type MessageAttachment = {
  id: string
  message_id: string
  mime_type: string
  storage_path: string
  file_size: number
  width: number | null
  height: number | null
  duration_seconds: number | null
  created_at: string
}

export type MatchStatus = 'chatting' | 'hire_pending' | 'hired' | 'unmatched' | 'archived'

export type TypingUser = {
  userId: string
  matchId: string
  isTyping: boolean
  updatedAt: string
}

const PAGE_SIZE = 50
const TYPING_DEBOUNCE_MS = 800
const TYPING_TTL_MS = 3000

export function canSendMessage(status: MatchStatus) {
  return status === 'chatting' || status === 'hire_pending'
}

export function applyRealtimeMessage(existing: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
  if (existing.some((message) => message.id === incoming.id)) {
    return existing
  }
  return [...existing, incoming]
}

export async function fetchMessages(matchId: string, page = 0): Promise<ChatMessage[]> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, error } = await supabase
    .from('messages')
    .select('id,match_id,sender_id,body,created_at,read_at')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true })
    .range(from, to)

  if (error) throw error
  return (data ?? []) as ChatMessage[]
}

export async function fetchMessageAttachments(messageIds: string[]): Promise<MessageAttachment[]> {
  if (messageIds.length === 0) return []

  const { data, error } = await supabase
    .from('message_attachments')
    .select('id,message_id,mime_type,storage_path,file_size,width,height,duration_seconds,created_at')
    .in('message_id', messageIds)

  if (error) throw error
  return (data ?? []) as MessageAttachment[]
}

export async function uploadMessageAttachment(
  matchId: string,
  userId: string,
  file: Blob,
  mimeType: string,
  options?: { width?: number; height?: number; duration?: number }
): Promise<{ path: string; fileSize: number }> {
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${mimeType.split('/')[1] || 'bin'}`
  const path = `${matchId}/${userId}/${fileName}`

  const { error } = await supabase.storage.from('chat-media').upload(path, file, {
    contentType: mimeType,
    upsert: false,
  })

  if (error) throw error

  return { path, fileSize: file.size }
}

export async function createMessageWithAttachments({
  matchId,
  senderId,
  body,
  matchStatus,
  attachments,
}: {
  matchId: string
  senderId: string
  body: string
  matchStatus: MatchStatus
  attachments: Array<{
    mime_type: string
    storage_path: string
    file_size: number
    width?: number
    height?: number
    duration_seconds?: number
  }>
}): Promise<ChatMessage> {
  const trimmed = body.trim()
  if (!trimmed && attachments.length === 0) throw new Error('Message cannot be empty')
  if (!canSendMessage(matchStatus)) {
    throw new Error('Messaging is not available for this match')
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({ match_id: matchId, sender_id: senderId, body: trimmed })
    .select('id,match_id,sender_id,body,created_at,read_at')
    .single()

  if (error) throw error

  if (attachments.length > 0) {
    const { error: attachError } = await supabase
      .from('message_attachments')
      .insert(
        attachments.map((a) => ({
          message_id: message.id,
          mime_type: a.mime_type,
          storage_path: a.storage_path,
          file_size: a.file_size,
          width: a.width ?? null,
          height: a.height ?? null,
          duration_seconds: a.duration_seconds ?? null,
        }))
      )

    if (attachError) throw attachError
  }

  return message as ChatMessage
}

export async function sendMessage({
  matchId,
  senderId,
  body,
  matchStatus,
}: {
  matchId: string
  senderId: string
  body: string
  matchStatus: MatchStatus
}): Promise<ChatMessage> {
  const trimmed = body.trim()
  if (!trimmed) throw new Error('Message cannot be empty')
  if (!canSendMessage(matchStatus)) {
    throw new Error('Messaging is not available for this match')
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({ match_id: matchId, sender_id: senderId, body: trimmed })
    .select('id,match_id,sender_id,body,created_at')
    .single()

  if (error) throw error
  return data as ChatMessage
}

export function subscribeToMessages(
  matchId: string,
  onMessage: (message: ChatMessage) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`match:${matchId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => {
        onMessage(payload.new as ChatMessage)
      }
    )
    .subscribe()

  return channel
}

export function subscribeToTyping(
  matchId: string,
  onTyping: (typing: TypingUser) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`match:${matchId}:typing`)
    .on(
      'broadcast',
      { event: 'typing' },
      (payload) => {
        onTyping(payload.payload as TypingUser)
      }
    )
    .subscribe()

  return channel
}

export async function broadcastTyping(
  matchId: string,
  userId: string,
  isTyping: boolean
): Promise<void> {
  const channel = supabase.channel(`match:${matchId}:typing`)
  const payload: TypingUser = {
    userId,
    matchId,
    isTyping,
    updatedAt: new Date().toISOString(),
  }

  await channel.send({
    type: 'broadcast',
    event: 'typing',
    payload,
  })
  await channel.unsubscribe()
}

export function subscribeToReadReceipts(
  matchId: string,
  onRead: (messageId: string, readAt: string) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`match:${matchId}:read`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => {
        const newRecord = payload.new as ChatMessage
        const oldRecord = payload.old as ChatMessage
        if (newRecord.read_at && newRecord.read_at !== oldRecord.read_at) {
          onRead(newRecord.id, newRecord.read_at)
        }
      }
    )
    .subscribe()

  return channel
}

export async function markMessagesAsRead(matchId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('match_id', matchId)
    .neq('sender_id', userId)
    .is('read_at', null)

  if (error) throw error
}

export function useChat(matchId: string, matchStatus: MatchStatus) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = ['chat-messages', matchId]
  const queryKeyRef = useRef(queryKey)
  queryKeyRef.current = queryKey
  const matchStatusRef = useRef(matchStatus)
  matchStatusRef.current = matchStatus

  const [typingUsers, setTypingUsers] = useState<Record<string, TypingUser>>({})
  const [readReceipts, setReadReceipts] = useState<Record<string, string>>({})

  const messagesQuery = useQuery({
    queryKey,
    enabled: Boolean(matchId),
    queryFn: () => fetchMessages(matchId),
  })

  const send = useMutation({
    mutationKey: ['send-message', matchId],
    mutationFn: (body: string) => {
      if (!user) throw new Error('useChat requires an authenticated user');
      return sendMessage({
        matchId,
        senderId: user.id,
        body,
        matchStatus: matchStatusRef.current,
      });
    },
    onSuccess: (message) => {
      queryClient.setQueryData<ChatMessage[]>(queryKeyRef.current, (current = []) =>
        applyRealtimeMessage(current, message)
      )
    },
  })

  const sendMedia = useMutation({
    mutationKey: ['send-media', matchId],
    mutationFn: async ({
      body,
      attachments,
    }: {
      body: string
      attachments: Array<{
        mime_type: string
        storage_path: string
        file_size: number
        width?: number
        height?: number
        duration_seconds?: number
      }>
    }) => {
      if (!user) throw new Error('useChat requires an authenticated user');
      return createMessageWithAttachments({
        matchId,
        senderId: user.id,
        body,
        matchStatus: matchStatusRef.current,
        attachments,
      });
    },
    onSuccess: (message) => {
      queryClient.setQueryData<ChatMessage[]>(queryKeyRef.current, (current = []) =>
        applyRealtimeMessage(current, message)
      )
    },
  })

  // Mark messages as read when chat is opened
  useEffect(() => {
    if (!matchId || !user) return
    markMessagesAsRead(matchId, user.id).catch(console.error)
  }, [matchId, user])

  useEffect(() => {
    if (!matchId) return

    const channel = subscribeToMessages(matchId, (message) => {
      queryClient.setQueryData<ChatMessage[]>(queryKeyRef.current, (current = []) =>
        applyRealtimeMessage(current ?? [], message)
      )
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId, queryClient])

  // Subscribe to read receipts
  useEffect(() => {
    if (!matchId) return

    const channel = subscribeToReadReceipts(matchId, (messageId, readAt) => {
      setReadReceipts((prev) => ({ ...prev, [messageId]: readAt }))
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId])

  useEffect(() => {
    if (!matchId || !user) return

    const channel = subscribeToTyping(matchId, (typing) => {
      if (typing.userId === user.id) return // Ignore own typing events

      setTypingUsers((prev) => {
        if (!typing.isTyping) {
          const next = { ...prev }
          delete next[typing.userId]
          return next
        }
        return { ...prev, [typing.userId]: typing }
      })
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId, user])

  // Clean up stale typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setTypingUsers((prev) => {
        let changed = false
        const next = { ...prev }
        for (const [userId, typing] of Object.entries(prev)) {
          const age = now - new Date(typing.updatedAt).getTime()
          if (age > TYPING_TTL_MS) {
            delete next[userId]
            changed = true
          }
        }
        return changed ? next : prev
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const dataRef = useRef(messagesQuery.data)
  dataRef.current = messagesQuery.data

  const loadMore = useCallback(async () => {
    const current = dataRef.current ?? []
    const nextPage = Math.floor(current.length / PAGE_SIZE)
    const older = await fetchMessages(matchId, nextPage)
    queryClient.setQueryData<ChatMessage[]>(queryKeyRef.current, (existing = []) => {
      const merged = [...older, ...existing]
      const seen = new Set<string>()
      return merged.filter((message) => {
        if (seen.has(message.id)) return false
        seen.add(message.id)
        return true
      })
    })
  }, [matchId, queryClient, queryKey])

  const sendTyping = useCallback(
    async (isTyping: boolean) => {
      if (!user || !matchId) return
      await broadcastTyping(matchId, user.id, isTyping)
    },
    [user, matchId]
  )

  const typingUserNames = Object.values(typingUsers)

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    error: messagesQuery.error,
    send,
    sendMedia,
    loadMore,
    canSend: canSendMessage(matchStatus),
    typingUsers: typingUserNames,
    sendTyping,
    readReceipts,
  }
}
