import React from 'react';
import { View, Text, Pressable } from '@/components/tw';
import type { Job } from '@hi-hired/shared';
import { formatDistance } from '@/lib/distance';
import { useSalaryAggregate, formatSalaryAggregate } from '@/hooks/useSalaryAggregate';
import { useCommute } from '@/hooks/useCommute';
import { CommuteBadge } from './CommuteBadge';
import { MatchScoreBadge } from './MatchScoreBadge';
import { SalaryDisplay } from './SalaryDisplay';
import { fetchMatchScore } from '@/lib/forecast';
import type { MatchScoreResult, UserProfileInput } from '@/lib/forecast';
import { useTheme } from '@/providers/ThemeProvider';
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
  /** Whether this card is the top (interactive) card in the stack. Background cards skip expensive queries. */
  isInteractive?: boolean;
}

/**
 * JobCard visual per tinder-job-card-reference.html + GUARDRAILS (NativeWind adapt).
 * Large pay, tactile feel, high contrast, a11y labels.
 * No gesture here (owned by SwipeDeck).
 *
 * Theme-aware: reads colors from ThemeProvider instead of hardcoded values.
 */
export const JobCard = React.memo(function JobCard({ job, onPress, testID, userLocation, showMatchScore, userProfile, isInteractive = true }: JobCardProps) {
  const { colors } = useTheme();
  // Skip salary aggregate query on non-interactive (background) cards
  const { data: salaryAggregate } = useSalaryAggregate(isInteractive ? job.id : undefined);
  const salaryLabel = formatSalaryAggregate(salaryAggregate ?? null);
  const distanceText = userLocation
    ? formatDistance(job.lat, job.lng, userLocation.latitude, userLocation.longitude)
    : null;

  // Commute estimation — only fires when interactive and userLocation + job coords are available
  const hasJobCoords = job.lat != null && job.lng != null;
  const commuteLat: number | null = isInteractive && hasJobCoords && userLocation ? job.lat ?? null : null;
  const commuteLng: number | null = isInteractive && hasJobCoords && userLocation ? job.lng ?? null : null;
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
    enabled: !!showMatchScore && !!userProfile && isInteractive,
    staleTime: 5 * 60 * 1000,
  });
  const matchScore: MatchScoreResult | undefined = matchScoreQuery.data;

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        backgroundColor: colors.surface,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
      }}
    >
      {/* Photo area */}
      <View style={{ height: 224, backgroundColor: colors.photoBase, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <Text style={{ color: colors.muted, fontSize: 12, letterSpacing: 3 }}>{job.suburb.toUpperCase()}</Text>
        <Text style={{ color: colors.subtle, fontSize: 10, marginTop: 2 }}>{job.hours_text}</Text>
        <View style={{ position: 'absolute', top: 16, right: 16, paddingHorizontal: 12, paddingVertical: 1, backgroundColor: colors.surface, borderRadius: 4 }} accessibilityLabel={`Job type: ${job.job_type}`}>
          <Text style={{ color: colors.text, fontSize: 9, fontWeight: 'bold', letterSpacing: 2 }}>{job.job_type.replace('_', ' ').toUpperCase()}</Text>
        </View>
        {showBadges && (
          <>
          <View style={{ position: 'absolute', bottom: 16, left: 16, right: 16, flexDirection: 'row', gap: 8 }}>
            {distanceText && (
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: `${colors.accent}e6`, borderRadius: 999 }}>
                <Text style={{ color: colors.surface, fontSize: 10, fontWeight: '600', letterSpacing: 1 }}>{distanceText}</Text>
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

      <View style={{ padding: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={{ color: colors.text, fontSize: 21, lineHeight: 24, fontWeight: '600', letterSpacing: -0.4 }}>{job.title}</Text>
            <SalaryDisplay payDisplay={job.pay_display} salaryLabel={salaryLabel} />
          </View>
          <Text style={{ color: colors.muted, fontSize: 10, paddingTop: 4 }}>in circle</Text>
        </View>

        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 12 }}>{job.suburb} • {job.hours_text}</Text>

        {job.description && (
          <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20, marginTop: 12 }} numberOfLines={2}>
            {job.description}
          </Text>
        )}
      </View>
    </Pressable>
  );
});

export default JobCard;
