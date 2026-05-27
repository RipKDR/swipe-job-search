import React from 'react'
import { View, Text, FlatList } from 'react-native'
import { useRouter } from 'expo-router'
import { Button } from '@/components/ui/Button'
import { JobListItem } from '@/components/employer/JobListItem'
import { useMyJobs } from '@/hooks/useMyJobs'

export default function JobsScreen() {
  const router = useRouter()
  const { data: jobs = [], isLoading, error, refetch } = useMyJobs()

  return (
    <View className="flex-1 bg-slate-950 px-4 pt-14 pb-6 gap-4">
      <View className="gap-2">
        <Text className="text-white text-2xl font-semibold">My Jobs</Text>
        <Text className="text-slate-400">Track active roles and interested candidates.</Text>
      </View>

      <Button title="Post new job" onPress={() => router.push('/(employer)/(tabs)/post-job')} />

      {isLoading ? (
        <Text className="text-slate-300">Loading jobs...</Text>
      ) : error ? (
        <View className="gap-2">
          <Text className="text-rose-300">Unable to load your jobs.</Text>
          <Button title="Retry" variant="secondary" onPress={() => refetch()} />
        </View>
      ) : jobs.length === 0 ? (
        <Text className="text-slate-300">No jobs posted yet.</Text>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(job) => job.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <JobListItem
              job={item}
              onOpenInterested={(jobId) => router.push(`/(employer)/(tabs)/jobs/${jobId}/interested`)}
            />
          )}
        />
      )}
    </View>
  )
}
