import React, { useCallback } from 'react';
import { View, Text } from '@/components/tw';
import { FlatList } from 'react-native';
import type { ChatMessage } from '@/hooks/useChat';
import { contentMaxWidthChat, screenPadding } from '@/lib/responsive-layout';

type MessageBubbleProps = {
  message: ChatMessage;
  isMine: boolean;
};

const MessageBubble = React.memo(function MessageBubble({ message, isMine }: MessageBubbleProps) {
  return (
    <View className={`max-w-[85%] sm:max-w-[75%] ${isMine ? 'self-end' : 'self-start'}`}>
      <View
        className={`rounded-2xl px-4 py-3 ${
          isMine ? 'bg-indigo-600 rounded-br-sm' : 'bg-slate-800 rounded-bl-sm'
        }`}
      >
        <Text className="text-white text-[15px] sm:text-base leading-relaxed">{message.body}</Text>
      </View>
    </View>
  );
});

type MessageListProps = {
  messages: ChatMessage[];
  currentUserId: string;
  isLoading?: boolean;
};

export function MessageList({ messages, currentUserId, isLoading }: MessageListProps) {
  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageBubble message={item} isMine={item.sender_id === currentUserId} />
    ),
    [currentUserId],
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
      <FlatList
        style={{ flex: 1, width: '100%' }}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        renderItem={renderItem}
      />
    </View>
  );
}
