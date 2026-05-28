import { View, Text } from 'react-native'
import { MatchInboxList } from '@/components/chat/MatchInboxList'
import { useMatchInbox } from '@/hooks/useMatchInbox'

export default function CandidateMatchesScreen() {
  const { data: matches = [], isLoading, error } = useMatchInbox()

  return (
    <View className="flex-1 bg-slate-950">
      <View className="px-4 pt-14 pb-4 gap-1">
        <Text className="text-white text-2xl font-semibold">Your Matches</Text>
        <Text className="text-slate-400">Employers who want to chat about jobs you liked.</Text>
      </View>
      <MatchInboxList matches={matches} isLoading={isLoading} error={error} role="candidate" />
    </View>
  )
}
