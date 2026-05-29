import React from 'react';
import { View, Text, Pressable } from '@/components/tw';
import { Button } from '@/components/ui/Button';
import type { MyJobItem } from '@/hooks/useMyJobs';

type JobListItemProps = {
  job: MyJobItem;
  onOpenInterested: (jobId: string) => void;
};

export const JobListItem = React.memo(function JobListItem({ job, onOpenInterested }: JobListItemProps) {
  const isExpired =
    job.status === 'expired' || (job.expires_at && new Date(job.expires_at) < new Date());
  const statusColor = isExpired ? 'text-rose-400' : 'text-emerald-400';

  return (
    <Pressable
      onPress={() => job.interestedCount > 0 && onOpenInterested(job.id)}
      className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 gap-3 active:opacity-95"
    >
      <View className="flex-row justify-between items-start gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-white text-lg font-semibold">{job.title}</Text>
          <Text className="text-slate-400">{job.suburb}</Text>
          <Text className="text-indigo-300 font-semibold text-base">{job.pay_display}</Text>
        </View>
        <Text className={`text-xs font-semibold ${statusColor} uppercase tracking-wider`}>
          {isExpired ? 'Expired' : job.status}
        </Text>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-slate-500 text-sm">
          {job.interestedCount} interested
        </Text>
        <Button
          title="View interested"
          variant="secondary"
          onPress={() => onOpenInterested(job.id)}
          disabled={job.interestedCount === 0}
          className="px-4 py-3"
        />
      </View>
    </Pressable>
  );
});

export default JobListItem;
