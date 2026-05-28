import { View, Text, FlatList, Pressable } from 'react-native'
import { useRouter, type Href } from 'expo-router'
import type { InboxMatch } from '@/hooks/useMatchInbox'

type MatchInboxListProps = {
  matches: InboxMatch[]
  isLoading?: boolean
  error?: unknown
  role: 'candidate' | 'employer'
}

export function MatchInboxList({ matches, isLoading, error, role }: MatchInboxListProps) {
  const router = useRouter()

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-slate-400">Loading matches…</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-rose-300 text-center">Unable to load matches right now.</Text>
      </View>
    )
  }

  if (matches.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-white text-lg font-medium text-center">No active matches yet</Text>
        <Text className="text-slate-400 text-center mt-2">
          {role === 'candidate'
            ? 'When an employer starts a chat, it will appear here.'
            : 'Tap Chat on an interested candidate to start a conversation.'}
        </Text>
      </View>
    )
  }

  return (
    <FlatList
      data={matches}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/chat/${item.id}` as Href)}
          className="rounded-xl bg-slate-900 border border-slate-800 p-4 gap-2 active:bg-slate-800"
        >
          {item.isNewMatch ? (
            <Text className="text-indigo-300 text-xs font-semibold tracking-wide uppercase">
              {role === 'candidate' ? 'Employer wants to chat' : 'New match'}
            </Text>
          ) : null}
          <Text className="text-white text-lg font-semibold">{item.counterpartName}</Text>
          <Text className="text-slate-400">{item.jobTitle}</Text>
          <Text className="text-slate-300 mt-1" numberOfLines={1}>
            {item.lastMessagePreview ?? 'Tap to open chat'}
          </Text>
          {item.status === 'hire_pending' ? (
            <Text className="text-amber-300 text-sm mt-1">Hire confirmation pending</Text>
          ) : null}
        </Pressable>
      )}
    />
  )
}
