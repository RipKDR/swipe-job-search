import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable } from '@/components/tw';
import type { Job } from '@hi-hired/shared';
import { formatDistance } from '@/lib/distance';
import { useSalaryAggregate, formatSalaryAggregate } from '@/hooks/useSalaryAggregate';
import { useCommute } from '@/hooks/useCommute';
import { CommuteBadge } from './CommuteBadge';
import { MatchScoreBadge } from './MatchScoreBadge';
import { fetchMatchScore } from '@/lib/forecast';
import type { MatchScoreResult, UserProfileInput } from '@/lib/forecast';
import { useQuery } from '@tanstack/react-query';

interface JobCardProps {
  job: Job;
  onPress?: () => void;
  testID?: string;
  /** Current user location for showing distance badge */
  userLocation?: { latitude: number; longitude: number } | null;
  /** Feature flag: show match score badge on the card */
  showMatchScore?: boolean;
  /** Current user profile for computing match scores */
  userProfile?: UserProfileInput | null;
}

/**
 * JobCard visual per tinder-job-card-reference.html + GUARDRAILS (NativeWind adapt).
 * Large pay, tactile feel, high contrast, a11y labels.
 * No gesture here (owned by SwipeDeck).
 */
export const JobCard = React.memo(function JobCard({ job, onPress, testID, userLocation, showMatchScore, userProfile }: JobCardProps) {
  const { data: salaryAggregate } = useSalaryAggregate(job.id);
  const salaryLabel = formatSalaryAggregate(salaryAggregate ?? null);
  const distanceText = userLocation
    ? formatDistance(job.lat, job.lng, userLocation.latitude, userLocation.longitude)
    : null;

  // Commute estimation — only fires when userLocation and job coords are available
  const hasJobCoords = job.lat != null && job.lng != null;
  const commuteLat: number | null = hasJobCoords && userLocation ? job.lat ?? null : null;
  const commuteLng: number | null = hasJobCoords && userLocation ? job.lng ?? null : null;
  const { commuteMinutes } = useCommute(commuteLat, commuteLng);

  const accessibilityLabel = `Job card: ${job.title} at ${job.suburb}. Pay ${job.pay_display}. ${job.hours_text}.${
    salaryLabel ? ` ${salaryLabel}.` : ''
  }${
    commuteMinutes ? ` ${commuteMinutes} min drive.` : ''
  } Tap for details or swipe.`;

  // Determine if we should render the bottom badge row at all
  const showBadges = distanceText != null || commuteMinutes != null || showMatchScore;

  // Match score — fetched when feature is enabled and user profile is available
  const matchScoreQuery = useQuery({
    queryKey: ['match-score', job.id, userProfile?.user_id],
    queryFn: () =>
      fetchMatchScore(
        userProfile!,
        job.id,
        {
          title: job.title,
          description: job.description ?? '',
          suburb: job.suburb,
          location: { suburb: job.suburb },
          pay_amount: job.pay_amount,
          salary: { max: job.pay_amount },
          employment_type: job.job_type,
          job_type: job.job_type,
          requirements: [],
        },
      ),
    enabled: !!showMatchScore && !!userProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  const matchScore: MatchScoreResult | undefined = matchScoreQuery.data;

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
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
        {showBadges && (
          <>
          <View className="absolute bottom-4 left-4 right-4 flex-row gap-2">
            {distanceText && (
              <View className="px-2.5 py-1 bg-[#166534]/90 rounded-full">
                <Text className="text-[#f4f0e9] text-[10px] font-semibold tracking-wide">{distanceText}</Text>
              </View>
            )}
            {commuteMinutes != null && <CommuteBadge minutes={commuteMinutes} />}
          </View>
          {showMatchScore && matchScore && (
            <MatchScoreBadge
              score={matchScore.score}
              matchingSkills={matchScore.matching_skills}
              missingSkills={matchScore.missing_skills}
            />
          )}
          </>
        )}
      </View>

      <View className="p-5">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 pr-2">
            <Text className="text-[#1f1c18] text-[21px] leading-none font-semibold tracking-[-0.4px]">{job.title}</Text>
            <View className="mt-1 flex-row items-baseline">
              <Text className="text-[36px] font-semibold tabular-nums tracking-[-1.5px] text-[#166534]">{job.pay_display}</Text>
            </View>
            {salaryLabel && (
              <Text className="mt-0.5 text-[11px] text-[#6b665f] tabular-nums">
                {salaryLabel}
              </Text>
            )}
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
