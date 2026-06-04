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
}

export type MatchStatus = 'chatting' | 'hire_pending' | 'hired' | 'unmatched' | 'archived'

const PAGE_SIZE = 50

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

  const { data, error } = await (supabase as any)
    .from('messages')
    .select('id,match_id,sender_id,body,created_at')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true })
    .range(from, to)

  if (error) throw error
  return (data ?? []) as ChatMessage[]
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

  const { data, error } = await (supabase as any)
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

export function useChat(matchId: string, matchStatus: MatchStatus) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = ['chat-messages', matchId]
  const queryKeyRef = useRef(queryKey)
  queryKeyRef.current = queryKey
  const matchStatusRef = useRef(matchStatus)
  matchStatusRef.current = matchStatus

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

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    error: messagesQuery.error,
    send,
    loadMore,
    canSend: canSendMessage(matchStatus),
  }
}
