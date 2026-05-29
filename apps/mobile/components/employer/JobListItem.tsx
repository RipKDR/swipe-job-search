import React from 'react'
import { View, Text, Pressable } from '@/components/tw'
import { Button } from '@/components/ui/Button'
import type { MyJobItem } from '@/hooks/useMyJobs'

type JobListItemProps = {
  job: MyJobItem
  onOpenInterested: (jobId: string) => void
}

export function JobListItem({ job, onOpenInterested }: JobListItemProps) {
  const isExpired = job.status === 'expired' || (job.expires_at && new Date(job.expires_at) < new Date())
  const statusColor = isExpired ? 'text-rose-400' : 'text-emerald-400'

  return (
    <Pressable
      onPress={() => onOpenInterested(job.id)}
      disabled={job.interestedCount === 0}
      className="rounded-xl border border-slate-800 bg-slate-900 p-4 gap-3 active:opacity-90"
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 gap-1">
          <Text className="text-white text-lg font-semibold">{job.title}</Text>
          <Text className="text-slate-300">{job.suburb}</Text>
          <Text className="text-blue-300 font-medium">{job.pay_display}</Text>
        </View>

        <Text className={`text-xs font-medium ${statusColor} uppercase tracking-wider`}>
          {isExpired ? 'Expired' : job.status}
        </Text>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-slate-400 text-sm">
          {job.interestedCount} interested
        </Text>

        <Button
          title="View interested"
          variant="secondary"
          onPress={() => onOpenInterested(job.id)}
          disabled={job.interestedCount === 0}
        />
      </View>
    </Pressable>
  )
}
