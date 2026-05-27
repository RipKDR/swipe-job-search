import React from 'react'
import { View, Text } from 'react-native'
import { Button } from '@/components/ui/Button'
import type { MyJobItem } from '@/hooks/useMyJobs'

type JobListItemProps = {
  job: MyJobItem
  onOpenInterested: (jobId: string) => void
}

export function JobListItem({ job, onOpenInterested }: JobListItemProps) {
  return (
    <View className="rounded-xl border border-slate-800 bg-slate-900 p-4 gap-3">
      <View className="gap-1">
        <Text className="text-white text-lg font-semibold">{job.title}</Text>
        <Text className="text-slate-300">{job.suburb}</Text>
        <Text className="text-blue-300">{job.pay_display}</Text>
        <Text className="text-slate-400 text-sm">Interested: {job.interestedCount}</Text>
      </View>
      <Button
        title="View interested"
        variant="secondary"
        onPress={() => onOpenInterested(job.id)}
        disabled={job.interestedCount === 0}
      />
    </View>
  )
}
