import React from 'react';
import { View, Text } from '@/components/tw';
import { Button } from '@/components/ui/Button';
import type { MyJobItem } from '@/hooks/useMyJobs';

type JobListItemProps = {
  job: MyJobItem;
  onOpenInterested: (jobId: string) => void;
  onEdit?: (jobId: string) => void;
  onToggleStatus?: (job: MyJobItem) => void;
  statusUpdating?: boolean;
};

function getStatusMeta(job: MyJobItem) {
  const isExpired =
    job.status === 'expired' || (job.expires_at && new Date(job.expires_at) < new Date());

  if (job.status === 'hired') {
    return { label: 'Hired', colorClass: 'text-indigo-300', actionLabel: null as string | null };
  }
  if (job.status === 'paused') {
    return { label: 'Paused', colorClass: 'text-amber-300', actionLabel: 'Reopen' };
  }
  if (isExpired) {
    return { label: 'Expired', colorClass: 'text-rose-400', actionLabel: 'Reopen' };
  }
  return { label: 'Active', colorClass: 'text-emerald-400', actionLabel: 'Pause' };
}

export const JobListItem = React.memo(function JobListItem({
  job,
  onOpenInterested,
  onEdit,
  onToggleStatus,
  statusUpdating = false,
}: JobListItemProps) {
  const status = getStatusMeta(job);

  return (
    <View
      className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 gap-3 active:opacity-95"
    >
      <View className="flex-row justify-between items-start gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-white text-lg font-semibold">{job.title}</Text>
          <Text className="text-slate-400">{job.suburb}</Text>
          <Text className="text-indigo-300 font-semibold text-base">{job.pay_display}</Text>
        </View>
        <Text className={`text-xs font-semibold ${status.colorClass} uppercase tracking-wider`}>
          {status.label}
        </Text>
      </View>

      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-slate-500 text-sm">
          {job.interestedCount} interested
        </Text>
        <View className="flex-row flex-wrap justify-end gap-2">
          {onEdit ? (
            <Button
              title="Edit"
              variant="secondary"
              onPress={() => onEdit(job.id)}
              className="px-4 py-3"
            />
          ) : null}
          {status.actionLabel && onToggleStatus ? (
            <Button
              title={status.actionLabel}
              variant="secondary"
              loading={statusUpdating}
              disabled={statusUpdating}
              onPress={() => onToggleStatus(job)}
              className="px-4 py-3"
            />
          ) : null}
          <Button
            title="View interested"
            variant="secondary"
            onPress={() => onOpenInterested(job.id)}
            disabled={job.interestedCount === 0}
            className="px-4 py-3"
          />
        </View>
      </View>
    </View>
  );
});

export default JobListItem;
