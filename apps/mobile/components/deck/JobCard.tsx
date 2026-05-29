import React from 'react';
import { View, Text, Pressable } from '@/components/tw';
import type { Job } from '@hi-hired/shared';

interface JobCardProps {
  job: Job;
  onPress?: () => void;
  testID?: string;
}

/**
 * JobCard visual per tinder-job-card-reference.html + GUARDRAILS (NativeWind adapt).
 * Large pay, tactile feel, high contrast, a11y labels.
 * No gesture here (owned by SwipeDeck).
 */
export const JobCard = React.memo(function JobCard({ job, onPress, testID }: JobCardProps) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Job card: ${job.title} at ${job.suburb}. Pay ${job.pay_display}. ${job.hours_text}. Tap for details or swipe.`}
      className="bg-[#f4f0e9] rounded-3xl overflow-hidden border border-[#2a2723] active:opacity-95"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
      }}
    >
      {/* Photo area (placeholder grain per ref) */}
      <View className="h-56 bg-[#2a2723] items-center justify-center relative">
        <View className="absolute inset-0 bg-[radial-gradient(#3a3630_0.6px,transparent_1px)] bg-size-[3px_3px] opacity-40" />
        <Text className="text-[#6b665f] text-xs tracking-[3px]">{job.suburb.toUpperCase()}</Text>
        <Text className="text-[#a19b8f] text-[10px] mt-0.5">{job.hours_text}</Text>
        <View className="absolute top-4 right-4 px-3 py-px bg-[#f4f0e9] rounded">
          <Text className="text-[#1f1c18] text-[9px] font-bold tracking-widest">{job.job_type.replace('_', ' ').toUpperCase()}</Text>
        </View>
      </View>

      <View className="p-5">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 pr-2">
            <Text className="text-[#1f1c18] text-[21px] leading-none font-semibold tracking-[-0.4px]">{job.title}</Text>
            <View className="mt-1 flex-row items-baseline">
              <Text className="text-[36px] font-semibold tabular-nums tracking-[-1.5px] text-[#166534]">{job.pay_display}</Text>
            </View>
          </View>
          <Text className="text-right text-[10px] text-[#6b665f] pt-1">in circle</Text>
        </View>

        <Text className="mt-3 text-[#6b665f] text-xs">{job.suburb} • {job.hours_text}</Text>

        {job.description && (
          <Text className="mt-3 text-[#1f1c18] text-sm leading-snug" numberOfLines={2}>
            {job.description}
          </Text>
        )}
      </View>
    </Pressable>
  );
});

export default JobCard;
