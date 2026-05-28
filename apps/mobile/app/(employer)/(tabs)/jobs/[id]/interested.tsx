import React, { useMemo, useState } from 'react'
import { View, Text, FlatList } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { InterestedCard, type InterestedActionState } from '@/components/employer/InterestedCard'
import { useInterestedList } from '@/hooks/useInterestedList'
import { useCreateMatch } from '@/hooks/useCreateMatch'

export default function InterestedListScreen() {
  const params = useLocalSearchParams<{ id: string }>()
  const jobId = Array.isArray(params.id) ? params.id[0] : params.id
  const { data: candidates = [], isLoading, error, refetch } = useInterestedList(jobId ?? '')
  const createMatch = useCreateMatch()
  const [states, setStates] = useState<Record<string, InterestedActionState>>({})
  const [message, setMessage] = useState<string | null>(null)

  const sortedCandidates = useMemo(() => candidates, [candidates])

  const onChat = async (candidateId: string) => {
    if (!jobId) return
    setMessage(null)
    setStates((prev) => ({ ...prev, [candidateId]: 'matching' }))
    try {
      const result = await createMatch.mutateAsync({ jobId, candidateId })
      setStates((prev) => ({
        ...prev,
        [candidateId]: result.status === 'already_matched' ? 'already_matched' : 'idle',
      }))
      setMessage(result.status === 'already_matched' ? 'Candidate is already matched.' : 'Match created. Open Matches to chat.')
      await refetch()
    } catch (matchError: any) {
      setStates((prev) => ({ ...prev, [candidateId]: 'error' }))
      setMessage(matchError?.message ?? 'Unable to create match')
    }
  }

  return (
    <View className="flex-1 bg-slate-950 px-4 pt-14 pb-6 gap-4">
      <View className="gap-1">
        <Text className="text-white text-2xl font-semibold">Interested candidates</Text>
        <Text className="text-slate-400">
          Candidates who swiped right (matched and blocked users are excluded).
        </Text>
      </View>

      {message ? <Text className="text-blue-200">{message}</Text> : null}

      {isLoading ? (
        <Text className="text-slate-300">Loading interested list...</Text>
      ) : error ? (
        <Text className="text-rose-300">Unable to load interested list.</Text>
      ) : sortedCandidates.length === 0 ? (
        <Text className="text-slate-300">No new interested candidates for this job.</Text>
      ) : (
        <FlatList
          data={sortedCandidates}
          keyExtractor={(candidate) => candidate.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <InterestedCard
              candidateId={item.id}
              fullName={item.fullName}
              suburb={item.suburb}
              skills={item.skills}
              actionState={states[item.id] ?? 'idle'}
              onChat={onChat}
            />
          )}
        />
      )}
    </View>
  )
}
