import React from 'react';
import { View, Text } from '@/components/tw';
import { Image, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCandidateProfile } from '@/hooks/useCandidateProfile';
import { useCreateMatch } from '@/hooks/useCreateMatch';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTheme } from '@/providers/ThemeProvider';
import { getErrorMessage } from '@/lib/errors';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .filter((c) => c.length > 0)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function CandidateDetailScreen() {
  const params = useLocalSearchParams<{ id: string; candidateId: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const jobId = Array.isArray(params.id) ? params.id[0] : params.id;
  const candidateId = Array.isArray(params.candidateId) ? params.candidateId[0] : params.candidateId;

  const {
    data: candidate,
    isLoading,
    error,
  } = useCandidateProfile(candidateId ?? '');

  const createMatch = useCreateMatch();
  const [matchState, setMatchState] = React.useState<
    'idle' | 'matching' | 'already_matched' | 'error'
  >('idle');
  const [message, setMessage] = React.useState<string | null>(null);

  const handleChat = async () => {
    if (!jobId || !candidateId) return;
    setMessage(null);
    setMatchState('matching');
    try {
      const result = await createMatch.mutateAsync({ jobId, candidateId });
      setMatchState(
        result.status === 'already_matched' ? 'already_matched' : 'idle',
      );
      if (result.matchId) {
        router.push(`/chat/${result.matchId}`);
      } else {
        setMessage(
          result.status === 'already_matched'
            ? 'Candidate is already matched.'
            : 'Match created. Open Matches to chat.',
        );
      }
    } catch (matchError: any) {
      setMatchState('error');
      setMessage(getErrorMessage(matchError, 'Unable to create match'));
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading candidate profile…" />;
  }

  if (error || !candidate) {
    return (
      <AppScreen>
        <ScreenHeader title="Candidate" onBack={() => router.back()} />
        <EmptyState
          emoji="😕"
          title="Could not load profile"
          description="The candidate profile could not be found."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </AppScreen>
    );
  }

  const isBusy = matchState === 'matching';
  const isAlreadyMatched = matchState === 'already_matched';
  const isDisabled = isBusy || isAlreadyMatched;
  const ctaText = isBusy ? 'Connecting…' : isAlreadyMatched ? 'Already matched' : 'Start chat';

  return (
    <AppScreen scroll centered={false}>
      <ScreenHeader title="Candidate Profile" onBack={() => router.back()} />

      {message ? (
        <Text className="text-indigo-300 mb-3 px-4">{message}</Text>
      ) : null}

      {/* Avatar section */}
      <View className="items-center py-6">
        {candidate.avatarUrl ? (
          <Image
            source={{ uri: candidate.avatarUrl }}
            className="w-24 h-24 rounded-full"
            accessibilityLabel={`${candidate.fullName}'s avatar`}
          />
        ) : (
          <View className="w-24 h-24 rounded-full bg-slate-700 items-center justify-center">
            <Text className="text-slate-300 text-3xl font-bold">
              {getInitials(candidate.fullName)}
            </Text>
          </View>
        )}
      </View>

      {/* Name & suburb */}
      <View className="items-center mb-6 px-4">
        <Text className="text-white text-2xl font-bold">{candidate.fullName}</Text>
        {candidate.suburb ? (
          <Text className="text-slate-400 mt-1">{candidate.suburb}</Text>
        ) : null}
      </View>

      {/* Detail sections */}
      <View
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.elevated,
          paddingHorizontal: 20,
          paddingVertical: 8,
          marginBottom: 24,
          marginHorizontal: 16,
        }}
      >
        {/* Skills */}
        {candidate.skills.length > 0 ? (
          <View
            style={{
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: 12,
                fontWeight: '500',
                letterSpacing: 1,
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Skills
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {candidate.skills.map((skill, idx) => (
                <View
                  key={idx}
                  style={{
                    backgroundColor: colors.primarySoft,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                  }}
                >
                  <Text style={{ color: colors.primaryLight, fontSize: 14 }}>
                    {skill}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Experience */}
        {candidate.experienceText ? (
          <View
            style={{
              paddingVertical: 12,
              borderBottomWidth: candidate.availabilityText || candidate.workRights ? 1 : 0,
              borderBottomColor: colors.border,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: 12,
                fontWeight: '500',
                letterSpacing: 1,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              Experience
            </Text>
            <Text style={{ color: colors.text, fontSize: 16, lineHeight: 22 }}>
              {candidate.experienceText}
            </Text>
          </View>
        ) : null}

        {/* Availability */}
        {candidate.availabilityText ? (
          <View
            style={{
              paddingVertical: 12,
              borderBottomWidth: candidate.workRights ? 1 : 0,
              borderBottomColor: colors.border,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: 12,
                fontWeight: '500',
                letterSpacing: 1,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              Availability
            </Text>
            <Text style={{ color: colors.text, fontSize: 16, lineHeight: 22 }}>
              {candidate.availabilityText}
            </Text>
          </View>
        ) : null}

        {/* Work rights */}
        {candidate.workRights ? (
          <View style={{ paddingVertical: 12 }}>
            <Text
              style={{
                color: colors.muted,
                fontSize: 12,
                fontWeight: '500',
                letterSpacing: 1,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              Work Rights
            </Text>
            <Text style={{ color: colors.text, fontSize: 16, lineHeight: 22 }}>
              {candidate.workRights}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Start Chat button */}
      <View className="px-4 pb-8">
        <Button
          title={ctaText}
          disabled={isDisabled}
          fullWidth
          onPress={handleChat}
        />
      </View>
    </AppScreen>
  );
}
