import { View, Text, FlatList, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { Button } from '@/components/ui/Button'
import { JobListItem } from '@/components/employer/JobListItem'
import { useMyJobs } from '@/hooks/useMyJobs'

export default function JobsScreen() {
  const router = useRouter()
  const { data: jobs = [], isLoading, error, refetch, isRefetching } = useMyJobs()

  const totalInterested = jobs.reduce((sum, j) => sum + (j.interestedCount || 0), 0)

  return (
    <View className="flex-1 bg-slate-950 px-4 pt-14 pb-6">
      <View className="mb-4">
        <Text className="text-white text-2xl font-semibold">My Jobs</Text>
        <Text className="text-slate-400 mt-1">
          {jobs.length} active role{jobs.length === 1 ? '' : 's'} · {totalInterested} interested candidates
        </Text>
      </View>

      <Button
        title="Post new job"
        onPress={() => router.push('/(employer)/(tabs)/post-job')}
        className="mb-4"
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-slate-300">Loading your jobs...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center gap-3">
          <Text className="text-rose-300 text-center">Unable to load your jobs.</Text>
          <Button title="Retry" variant="secondary" onPress={() => refetch()} />
        </View>
      ) : jobs.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-6xl mb-4">📭</Text>
          <Text className="text-white text-xl font-semibold text-center">No jobs yet</Text>
          <Text className="text-slate-400 text-center mt-2">
            Post your first casual role and start receiving interest from local candidates.
          </Text>
          <Button
            title="Post your first job"
            onPress={() => router.push('/(employer)/(tabs)/post-job')}
            className="mt-6"
          />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(job) => job.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#4ade80"
            />
          }
          renderItem={({ item }) => (
            <JobListItem
              job={item}
              onOpenInterested={(jobId) => router.push(`/(employer)/(tabs)/jobs/${jobId}/interested` as any)}
            />
          )}
        />
      )}
    </View>
  )
}
