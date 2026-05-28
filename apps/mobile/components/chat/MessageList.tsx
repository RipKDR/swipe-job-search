import { View, Text, FlatList } from 'react-native'
import type { ChatMessage } from '@/hooks/useChat'

type MessageListProps = {
  messages: ChatMessage[]
  currentUserId: string
  isLoading?: boolean
}

export function MessageList({ messages, currentUserId, isLoading }: MessageListProps) {
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-slate-400">Loading messages…</Text>
      </View>
    )
  }

  if (messages.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-slate-400 text-center">No messages yet. Say hello to get started.</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={messages}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16, gap: 8 }}
      renderItem={({ item }) => {
        const isMine = item.sender_id === currentUserId
        return (
          <View className={`max-w-[85%] ${isMine ? 'self-end' : 'self-start'}`}>
            <View
              className={`rounded-2xl px-4 py-3 ${
                isMine ? 'bg-indigo-600 rounded-br-sm' : 'bg-slate-800 rounded-bl-sm'
              }`}
            >
              <Text className="text-white text-[15px] leading-relaxed">{item.body}</Text>
            </View>
          </View>
        )
      }}
    />
  )
}
