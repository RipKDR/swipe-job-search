import React, { useMemo, useState, useCallback } from 'react';
import { Text } from '@/components/tw';
import { FlatList } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { InterestedCard, type InterestedActionState } from '@/components/employer/InterestedCard';
import { useInterestedList } from '@/hooks/useInterestedList';
import { useCreateMatch } from '@/hooks/useCreateMatch';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { TabWebShell } from '@/components/ui/TabWebShell';
import { useListColumns } from '@/hooks/useListColumns';
import { getErrorMessage } from '@/lib/errors';

type CandidateData = {
  id: string;
  fullName: string;
  suburb: string;
  skills: string[];
};

type InterestedCandidateItemProps = {
  candidate: CandidateData;
  actionState: InterestedActionState;
  onChat: (candidateId: string) => void;
};

const InterestedCandidateItem = React.memo(function InterestedCandidateItem({
  candidate,
  actionState,
  onChat,
}: InterestedCandidateItemProps) {
  return (
    <InterestedCard
      candidateId={candidate.id}
      fullName={candidate.fullName}
      suburb={candidate.suburb}
      skills={candidate.skills}
      actionState={actionState}
      onChat={onChat}
    />
  );
});

export default function InterestedListScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const jobId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data: candidates = [], isLoading, error, refetch } = useInterestedList(jobId ?? '');
  const createMatch = useCreateMatch();
  const [states, setStates] = useState<Record<string, InterestedActionState>>({});
  const [message, setMessage] = useState<string | null>(null);
  const numColumns = useListColumns(2);

  const sortedCandidates = useMemo(() => candidates, [candidates]);

  const onChat = useCallback(
    async (candidateId: string) => {
      if (!jobId) return;
      setMessage(null);
      setStates((prev) => ({ ...prev, [candidateId]: 'matching' }));
      try {
        const result = await createMatch.mutateAsync({ jobId, candidateId });
        setStates((prev) => ({
          ...prev,
          [candidateId]: result.status === 'already_matched' ? 'already_matched' : 'idle',
        }));
        if (result.matchId) {
          router.push(`/chat/${result.matchId}` as Href);
        } else {
          setMessage(
            result.status === 'already_matched'
              ? 'Candidate is already matched.'
              : 'Match created. Open Matches to chat.',
          );
        }
        await refetch();
      } catch (matchError: any) {
        setStates((prev) => ({ ...prev, [candidateId]: 'error' }));
        setMessage(getErrorMessage(matchError, 'Unable to create match'));
      }
    },
    [jobId, createMatch, router, refetch],
  );

  const renderItem = useCallback(
    ({ item }: { item: CandidateData }) => (
      <InterestedCandidateItem
        candidate={item}
        actionState={states[item.id] ?? 'idle'}
        onChat={onChat}
      />
    ),
    [states, onChat],
  );

  if (isLoading) {
    return <LoadingScreen message="Loading interested candidates…" />;
  }

  return (
    <AppScreen centered={false} maxWidth="tab">
      <TabWebShell>
        <ScreenHeader
          title="Interested"
          subtitle="Candidates who swiped right on this job."
          onBack={() => router.back()}
        />

        {message ? <Text className="text-indigo-300 mb-2">{message}</Text> : null}

        {error ? (
          <EmptyState
            emoji="⚠️"
            title="Could not load list"
            description="Try again in a moment."
            actionLabel="Go back"
            onAction={() => router.back()}
          />
        ) : sortedCandidates.length === 0 ? (
          <EmptyState
            emoji="👋"
            title="No new interest"
            description="When candidates swipe right, they will show up here."
          />
        ) : (
          <FlatList
            key={`interested-cols-${numColumns}`}
            data={sortedCandidates}
            numColumns={numColumns}
            keyExtractor={(candidate) => candidate.id}
            columnWrapperStyle={numColumns > 1 ? { gap: 12 } : undefined}
            contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
            renderItem={renderItem}
          />
        )}
      </TabWebShell>
    </AppScreen>
  );
}
