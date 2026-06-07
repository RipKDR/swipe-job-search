import React from 'react';
import { View, Text, Pressable } from '@/components/tw';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
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
import { useAccessibilityPreferences } from '@/hooks/useAccessibilityPreferences';

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
  const { fontScale, highContrast } = useAccessibilityPreferences();
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
        backgroundColor: 'transparent',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {/* Glassmorphism background — subtle blur + gradient overlay */}
      <BlurView
        intensity={30}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 24,
        }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.04)' }} />
      </BlurView>

      {/* Photo area with linear gradient depth */}
      <View style={{ height: 224, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.45)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <Text style={{ color: 'rgba(255,255,255,0.95)', fontSize: 12 * fontScale, letterSpacing: 3, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>{job.suburb.toUpperCase()}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 * fontScale, marginTop: 2, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>{job.hours_text}</Text>
        <View style={{ position: 'absolute', top: 16, right: 16, paddingHorizontal: 12, paddingVertical: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4, backdropFilter: 'blur(8px)' }} accessibilityLabel={`Job type: ${job.job_type}`}>
          <Text style={{ color: 'rgba(255,255,255,0.95)', fontSize: 9 * fontScale, fontWeight: 'bold', letterSpacing: 2 }}>{job.job_type.replace('_', ' ').toUpperCase()}</Text>
        </View>
        {showBadges && (
          <>
          <View style={{ position: 'absolute', bottom: 16, left: 16, right: 16, flexDirection: 'row', gap: 8 }}>
            {distanceText && (
              <BlurView intensity={20} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' }}>
                <Text style={{ color: 'rgba(0,0,0,0.9)', fontSize: 10 * fontScale, fontWeight: '600', letterSpacing: 1 }}>{distanceText}</Text>
              </BlurView>
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

      {/* Glassmorphism content area */}
      <BlurView intensity={25} style={{ padding: 20, backgroundColor: 'rgba(255,255,255,0.06)' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={{ color: colors.text, fontSize: 21 * fontScale, lineHeight: 24 * fontScale, fontWeight: '600', letterSpacing: -0.4 }}>{job.title}</Text>
            <SalaryDisplay payDisplay={job.pay_display} salaryLabel={salaryLabel} />
          </View>
          <Text style={{ color: colors.muted, fontSize: 10 * fontScale, paddingTop: 4 }}>in circle</Text>
        </View>

        <Text style={{ color: colors.muted, fontSize: 12 * fontScale, marginTop: 12 }}>{job.suburb} • {job.hours_text}</Text>

        {job.description && (
          <Text style={{ color: colors.text, fontSize: 14 * fontScale, lineHeight: 20 * fontScale, marginTop: 12 }} numberOfLines={2}>
            {job.description}
          </Text>
        )}
      </BlurView>
    </Pressable>
  );
});

export default JobCard;
