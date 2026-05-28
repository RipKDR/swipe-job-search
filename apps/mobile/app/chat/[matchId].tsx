import { useState } from 'react'
import { View, Text, Pressable, KeyboardAvoidingView, Platform } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useChat } from '@/hooks/useChat'
import { useMatchDetail } from '@/hooks/useMatchInbox'
import { shouldConfirmUnmatch, useHireConfirm } from '@/hooks/useHireConfirm'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { HireBar } from '@/components/chat/HireBar'
import { UnmatchSheet } from '@/components/chat/UnmatchSheet'
import { ReportSheet } from '@/components/moderation/ReportSheet'
import { BlockConfirm } from '@/components/moderation/BlockConfirm'
import { blockUser, submitReport, type ReportReason } from '@/lib/moderation'

export default function ChatScreen() {
  const params = useLocalSearchParams<{ matchId: string }>()
  const matchId = Array.isArray(params.matchId) ? params.matchId[0] : params.matchId
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, profile } = useAuth()
  const { data: match, isLoading: matchLoading, refetch: refetchMatch } = useMatchDetail(matchId ?? '')
  const { messages, isLoading: messagesLoading, send, canSend } = useChat(
    matchId ?? '',
    match?.status ?? 'chatting'
  )
  const { confirmHire, unmatch } = useHireConfirm()

  const [showUnmatch, setShowUnmatch] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showBlock, setShowBlock] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  if (!matchId || !user || !profile) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <Text className="text-slate-400">Loading chat…</Text>
      </View>
    )
  }

  const handleConfirmHire = async () => {
    setActionMessage(null)
    try {
      await confirmHire.mutateAsync(matchId)
      await refetchMatch()
      queryClient.invalidateQueries({ queryKey: ['match-inbox'] })
    } catch (error: any) {
      setActionMessage(error?.message ?? 'Unable to confirm hire')
    }
  }

  const handleUnmatch = async () => {
    setActionMessage(null)
    try {
      await unmatch.mutateAsync(matchId)
      setShowUnmatch(false)
      queryClient.invalidateQueries({ queryKey: ['match-inbox'] })
      router.back()
    } catch (error: any) {
      setActionMessage(error?.message ?? 'Unable to unmatch')
    }
  }

  const openUnmatch = () => {
    if (shouldConfirmUnmatch(messages.length)) {
      setShowUnmatch(true)
      return
    }
    void handleUnmatch()
  }

  const handleReport = async (reason: ReportReason, details?: string) => {
    if (!match) return
    await submitReport({
      reporterId: user.id,
      reportedId: match.counterpartId,
      reason,
      details,
      jobId: match.jobId,
      matchId: match.id,
    })
    setShowReport(false)
    setActionMessage('Report submitted. Thank you.')
  }

  const handleBlock = async () => {
    if (!match) return
    await blockUser(user.id, match.counterpartId)
    setShowBlock(false)
    queryClient.invalidateQueries({ queryKey: ['match-inbox'] })
    router.back()
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-950"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="px-4 pt-14 pb-3 border-b border-slate-800 gap-2">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="py-1">
            <Text className="text-indigo-400 text-base">Back</Text>
          </Pressable>
          <View className="flex-row gap-4">
            <Pressable onPress={() => setShowReport(true)}>
              <Text className="text-slate-300 text-sm">Report</Text>
            </Pressable>
            <Pressable onPress={() => setShowBlock(true)}>
              <Text className="text-slate-300 text-sm">Block</Text>
            </Pressable>
            <Pressable onPress={openUnmatch}>
              <Text className="text-rose-300 text-sm">Unmatch</Text>
            </Pressable>
          </View>
        </View>
        <Text className="text-white text-xl font-semibold">{match?.counterpartName ?? 'Chat'}</Text>
        <Text className="text-slate-400">{match?.jobTitle ?? ''}</Text>
        {actionMessage ? <Text className="text-blue-200 text-sm">{actionMessage}</Text> : null}
      </View>

      <MessageList
        messages={messages}
        currentUserId={user.id}
        isLoading={matchLoading || messagesLoading}
      />

      {match ? (
        <HireBar
          match={{
            status: match.status,
            candidate_hire_confirmed: match.candidate_hire_confirmed,
            employer_hire_confirmed: match.employer_hire_confirmed,
            hire_initiated_by: match.hire_initiated_by,
          }}
          userId={user.id}
          loading={confirmHire.isPending}
          onConfirmHire={handleConfirmHire}
        />
      ) : null}

      <MessageInput
        disabled={!canSend || match?.status === 'unmatched'}
        loading={send.isPending}
        onSend={async (body) => {
          await send.mutateAsync(body)
        }}
      />

      <UnmatchSheet
        visible={showUnmatch}
        requiresConfirmation={shouldConfirmUnmatch(messages.length)}
        loading={unmatch.isPending}
        onConfirm={handleUnmatch}
        onCancel={() => setShowUnmatch(false)}
      />

      <ReportSheet
        visible={showReport}
        onSubmit={handleReport}
        onCancel={() => setShowReport(false)}
      />

      <BlockConfirm
        visible={showBlock}
        counterpartName={match?.counterpartName ?? 'this user'}
        onConfirm={handleBlock}
        onCancel={() => setShowBlock(false)}
      />
    </KeyboardAvoidingView>
  )
}
