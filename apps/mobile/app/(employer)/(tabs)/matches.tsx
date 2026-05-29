import { View, Text } from '@/components/tw'
import { MatchInboxList } from '@/components/chat/MatchInboxList'
import { useMatchInbox } from '@/hooks/useMatchInbox'

export default function EmployerMatchesScreen() {
  const { data: matches = [], isLoading, error } = useMatchInbox()

  return (
    <View className="flex-1 bg-slate-950">
      <View className="px-4 pt-14 pb-4 gap-1">
        <Text className="text-white text-2xl font-semibold">Your Matches</Text>
        <Text className="text-slate-400">Active conversations with interested candidates.</Text>
      </View>
      <MatchInboxList matches={matches} isLoading={isLoading} error={error} role="employer" />
    </View>
  )
}
