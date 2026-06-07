import React, { useCallback, useMemo } from 'react';
import { View, Text } from '@/components/tw';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { FlatList } from 'react-native';
import type { ChatMessage, MessageAttachment } from '@/hooks/useChat';
import { contentMaxWidthChat, screenPadding } from '@/lib/responsive-layout';
import { AttachmentImage } from './AttachmentImage';
import { AttachmentVideo } from './AttachmentVideo';
import { AttachmentDocument } from './AttachmentDocument';

type MessageListProps = {
  messages: ChatMessage[];
  currentUserId: string;
  isLoading?: boolean;
  readReceipts?: Record<string, string>;
  attachmentsMap?: Record<string, MessageAttachment[]>;
};

const MessageBubble = React.memo(function MessageBubble({
  message,
  isMine,
  readAt,
  attachments = [],
}: {
  message: ChatMessage;
  isMine: boolean;
  readAt?: string;
  attachments?: MessageAttachment[];
}) {
  const renderAttachment = (att: MessageAttachment) => {
    if (att.mime_type.startsWith('image/')) {
      return <AttachmentImage key={att.id} attachment={att} />;
    }
    if (att.mime_type.startsWith('video/')) {
      return <AttachmentVideo key={att.id} attachment={att} />;
    }
    return <AttachmentDocument key={att.id} attachment={att} />;
  };

  return (
    <View className={`max-w-[85%] sm:max-w-[75%] ${isMine ? 'self-end' : 'self-start'}`}>
      <View
        className={`rounded-2xl px-4 py-3 ${
          isMine ? 'bg-indigo-600 rounded-br-sm' : 'bg-slate-800 rounded-bl-sm'
        }`}
      >
        {message.body ? (
          <Text className="text-white text-[15px] sm:text-base leading-relaxed">{message.body}</Text>
        ) : null}
        {attachments.length > 0 && (
          <View className="mt-2 gap-2">
            {attachments.map(renderAttachment)}
          </View>
        )}
        {isMine && readAt && (
          <Text className="text-indigo-200 text-xs mt-1 text-right">Read</Text>
        )}
      </View>
    </View>
  );
});

export function MessageList({ messages, currentUserId, isLoading, readReceipts, attachmentsMap = {} }: MessageListProps) {
  // Reverse the array for inverted FlatList — newest messages at the bottom.
  // Keep this before early returns so hook order is stable.
  const invertedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageBubble
        message={item}
        isMine={item.sender_id === currentUserId}
        readAt={item.sender_id === currentUserId ? readReceipts?.[item.id] : undefined}
        attachments={attachmentsMap[item.id] ?? []}
      />
    ),
    [currentUserId, readReceipts, attachmentsMap],
  );

  if (isLoading) {
    return (
      <View className={`flex-1 items-center justify-center ${screenPadding}`}>
        <Text className="text-slate-400">Loading messages…</Text>
      </View>
    );
  }

  if (messages.length === 0) {
    return (
      <View className={`flex-1 items-center justify-center ${screenPadding}`}>
        <Text className="text-slate-400 text-center max-w-sm">
          No messages yet. Say hello to get started.
        </Text>
      </View>
    );
  }
  return (
    <View className={`flex-1 w-full items-center ${contentMaxWidthChat}`}>
      <ErrorBoundary fallback={<Text className="text-slate-400 p-4">Something went wrong here.</Text>}>
        <FlatList
          style={{ flex: 1, width: '100%' }}
          data={invertedMessages}
          keyExtractor={(item: ChatMessage) => item.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={renderItem}
          inverted
        />
      </ErrorBoundary>
    </View>
  );
}
