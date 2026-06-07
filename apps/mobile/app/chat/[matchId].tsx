import { useState } from 'react'
import { View, Text, Pressable } from '@/components/tw'
import { KeyboardAvoidingView, Platform } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { usePostHog } from '@/hooks/usePostHog'
import { useAuth } from '@/hooks/useAuth'
import { useChat, fetchMessageAttachments, uploadMessageAttachment, type MessageAttachment } from '@/hooks/useChat'
import { useMatchDetail } from '@/hooks/useMatchInbox'
import { shouldConfirmUnmatch, useHireConfirm } from '@/hooks/useHireConfirm'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { TypingIndicator } from '@/components/chat/TypingIndicator'
import { HireBar } from '@/components/chat/HireBar'
import { PostHireSurvey } from '@/components/forms/PostHireSurvey'
import { UnmatchSheet } from '@/components/chat/UnmatchSheet'
import { ReportSheet } from '@/components/moderation/ReportSheet'
import { BlockConfirm } from '@/components/moderation/BlockConfirm'
import { blockUser, submitReport, type ReportReason } from '@/lib/moderation'
import { AmbientBackground } from '@/components/ui/AmbientBackground'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { getErrorMessage } from '@/lib/errors'
import { contentMaxWidthChat, screenPadding } from '@/lib/responsive-layout'
import type { PickedAttachment } from '@/components/chat/types'

function ChatAction({ label, onPress, tone }: { label: string; onPress: () => void; tone?: 'danger' | 'muted' }) {
  const color = tone === 'danger' ? 'text-rose-300' : 'text-slate-400';
  return (
    <Pressable onPress={onPress} className="py-1">
      <Text className={`${color} text-sm font-medium`}>{label}</Text>
    </Pressable>
  );
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{ matchId: string }>();
  const matchId = Array.isArray(params.matchId) ? params.matchId[0] : params.matchId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const posthog = usePostHog();
  const { data: match, isLoading: matchLoading, refetch: refetchMatch } = useMatchDetail(matchId ?? '');
  const { 
    messages, 
    isLoading: messagesLoading, 
    send, 
    sendMedia, 
    canSend, 
    typingUsers, 
    sendTyping, 
    readReceipts 
  } = useChat(
    matchId ?? '',
    match?.status ?? 'chatting',
  );
  const { confirmHire, unmatch } = useHireConfirm();

  const [showUnmatch, setShowUnmatch] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [surveyDone, setSurveyDone] = useState(false);

  // Fetch attachments for current messages
  const attachmentsQuery = useQuery({
    queryKey: ['chat-attachments', matchId, messages.map(m => m.id).sort().join(',')],
    queryFn: async () => {
      const ids = messages.map(m => m.id);
      if (ids.length === 0) return {} as Record<string, MessageAttachment[]>;
      const atts = await fetchMessageAttachments(ids);
      const map: Record<string, MessageAttachment[]> = {};
      atts.forEach((a) => {
        if (!map[a.message_id]) map[a.message_id] = [];
        map[a.message_id].push(a);
      });
      return map;
    },
    enabled: messages.length > 0,
  });

  const handleSurveySettled = () => {
    setSurveyDone(true);
    void refetchMatch();
  };

  if (!matchId || !user || !profile) {
    return <LoadingScreen message="Loading chat…" />;
  }

  const handleConfirmHire = async () => {
    setActionMessage(null);
    try {
      await confirmHire.mutateAsync(matchId);
      posthog.capture('hire_confirmed', { match_id: matchId, role: profile?.role });
      await refetchMatch();
      queryClient.invalidateQueries({ queryKey: ['match-inbox'] });
    } catch (error: any) {
      setActionMessage(getErrorMessage(error, 'Unable to confirm hire'));
    }
  };

  const handleUnmatch = async () => {
    setActionMessage(null);
    try {
      await unmatch.mutateAsync(matchId);
      posthog.capture('user_unmatched', { match_id: matchId, message_count: messages.length });
      setShowUnmatch(false);
      queryClient.invalidateQueries({ queryKey: ['match-inbox'] });
      router.back();
    } catch (error: any) {
      setActionMessage(getErrorMessage(error, 'Unable to unmatch'));
    }
  };

  const openUnmatch = () => {
    if (shouldConfirmUnmatch(messages.length)) {
      setShowUnmatch(true);
      return;
    }
    void handleUnmatch();
  };

  const handleReport = async (reason: ReportReason, details?: string) => {
    if (!match) return;
    await submitReport({
      reporterId: user.id,
      reportedId: match.counterpartId,
      reason,
      details,
      jobId: match.jobId,
      matchId: match.id,
    });
    posthog.capture('user_reported', { match_id: matchId, reason });
    setShowReport(false);
    setActionMessage('Report submitted. Thank you.');
  };

  const handleBlock = async () => {
    if (!match) return;
    await blockUser(user.id, match.counterpartId);
    posthog.capture('user_blocked', { match_id: matchId });
    setShowBlock(false);
    queryClient.invalidateQueries({ queryKey: ['match-inbox'] });
    router.back();
  };

  const handleSendMedia = async (body: string, picked: PickedAttachment[]) => {
    if (!user) throw new Error('Not authenticated');
    try {
      const uploaded = await Promise.all(
        picked.map(async (p) => {
          const res = await fetch(p.uri);
          const blob = await res.blob();
          const { path, fileSize } = await uploadMessageAttachment(
            matchId,
            user.id,
            blob,
            p.mimeType,
            { width: p.width, height: p.height, duration: p.duration }
          );
          return {
            mime_type: p.mimeType,
            storage_path: path,
            file_size: fileSize,
            width: p.width,
            height: p.height,
            duration_seconds: p.duration,
          };
        })
      );

      await sendMedia.mutateAsync({ body: body.trim(), attachments: uploaded });
      posthog.capture('message_sent_with_media', { 
        match_id: matchId, 
        attachment_count: uploaded.length,
        types: uploaded.map(u => u.mime_type.split('/')[0])
      });
    } catch (error) {
      posthog.capture('$exception', {
        $exception_message: getErrorMessage(error, 'send media failed'),
        $exception_type: error instanceof Error ? error.name : 'UnknownError',
        context: 'chat_send_media',
        match_id: matchId,
      });
      throw error;
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-950"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AmbientBackground />
      <View className="w-full items-center px-4 sm:px-6 lg:px-8 border-b border-slate-800/80">
        <View className="w-full max-w-lg lg:max-w-2xl self-center pt-12 sm:pt-14 pb-3 gap-2">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="py-1">
            <Text className="text-indigo-400 text-base font-medium">Back</Text>
          </Pressable>
          <View className="flex-row gap-4">
            <ChatAction label="Report" onPress={() => setShowReport(true)} />
            <ChatAction label="Block" onPress={() => setShowBlock(true)} />
            <ChatAction label="Unmatch" onPress={openUnmatch} tone="danger" />
          </View>
        </View>
        <Text className="text-white text-2xl sm:text-3xl font-bold tracking-tight">
          {match?.counterpartName ?? 'Chat'}
        </Text>
        <Text className="text-slate-400">{match?.jobTitle ?? ''}</Text>
        {actionMessage ? <Text className="text-indigo-200 text-sm">{actionMessage}</Text> : null}
        </View>
      </View>

      <MessageList
        messages={messages}
        currentUserId={user.id}
        isLoading={matchLoading || messagesLoading}
        readReceipts={readReceipts}
        attachmentsMap={attachmentsQuery.data}
      />

      <TypingIndicator typingUsers={typingUsers.length} currentUserId={user.id} />

      {/* Candidate salary survey — shown once after hire is confirmed by both parties */}
      {match && profile?.role === 'candidate' && match.status === 'hired' && !surveyDone ? (
        <View className={`w-full items-center ${screenPadding} border-t border-emerald-900`}>
          <View className={`w-full ${contentMaxWidthChat} py-3 gap-2`}>
            <PostHireSurvey
              jobId={match.jobId}
              jobTitle={match.jobTitle}
              onComplete={handleSurveySettled}
              onSkip={handleSurveySettled}
            />
          </View>
        </View>
      ) : null}

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
        loading={send.isPending || sendMedia.isPending}
        onSend={async (body) => {
          try {
            await send.mutateAsync(body)
            posthog.capture('message_sent', { match_id: matchId })
          } catch (error) {
            posthog.capture('$exception', {
              $exception_message: getErrorMessage(error, 'send message failed'),
              $exception_type: error instanceof Error ? error.name : 'UnknownError',
              context: 'chat_send_message',
              match_id: matchId,
            })
            throw error
          }
        }}
        onSendMedia={handleSendMedia}
        onTyping={sendTyping}
      />

      <UnmatchSheet
        visible={showUnmatch}
        requiresConfirmation={shouldConfirmUnmatch(messages.length)}
        loading={unmatch.isPending}
        onConfirm={handleUnmatch}
        onCancel={() => setShowUnmatch(false)}
      />

      <ReportSheet visible={showReport} onSubmit={handleReport} onCancel={() => setShowReport(false)} />

      <BlockConfirm
        visible={showBlock}
        counterpartName={match?.counterpartName ?? 'this user'}
        onConfirm={handleBlock}
        onCancel={() => setShowBlock(false)}
      />
    </KeyboardAvoidingView>
  );
}
