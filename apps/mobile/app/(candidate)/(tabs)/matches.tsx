import { useState, useCallback } from 'react';
import { MatchInboxList } from '@/components/chat/MatchInboxList';
import { MatchCelebration } from '@/components/match/MatchCelebration';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TabWebShell } from '@/components/ui/TabWebShell';
import { useMatchInbox } from '@/hooks/useMatchInbox';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, type Href } from 'expo-router';
import type { InboxMatch } from '@/hooks/useMatchInbox';
import { View, Text } from '@/components/tw';
import { useStreak } from '@/hooks/useStreak';

export default function CandidateMatchesScreen() {
  const { data: matches = [], isLoading, error } = useMatchInbox();
  const { profile } = useAuth();
  const router = useRouter();

  // ── Match celebration state ──
  const [celebratingMatch, setCelebratingMatch] = useState<InboxMatch | null>(null);

  // Streak badge integration (source-driven from useStreak.ts + lib/streak.ts + Jordan handoff architecture + PRD retention loops + next-phases plan).
  // Displays current streak + Active Seeker badge (from profiles via sync RPC) + at-risk warning.
  // When user deep-links to hi-hired://matches (from streak at-risk notif or direct), this provides immediate retention context.
  // Non-blocking; uses existing hook duality (AsyncStorage + Supabase source of truth, AEDT).
  const {
    currentStreak,
    activeSeekerBadgeEarned,
    atRisk,
    isLoading: streakLoading,
  } = useStreak();

  const handleCelebrateMatch = useCallback((match: InboxMatch) => {
    setCelebratingMatch(match);
  }, []);

  const closeCelebration = useCallback(() => {
    setCelebratingMatch(null);
  }, []);

  const handleSendMessage = useCallback(() => {
    if (!celebratingMatch) return;
    const id = celebratingMatch.id;
    setCelebratingMatch(null);
    router.push(`/chat/${id}` as Href);
  }, [celebratingMatch, router]);

  return (
    <>
      <AppScreen centered={false} maxWidth="tab">
        <TabWebShell>
          <ScreenHeader
            title="Matches"
            subtitle="Employers who want to chat about jobs you liked."
          />
          {/* Streak indicator in matches (enhancement per plan step 4; complements deck/profile wiring in dirty tree) */}
          {!streakLoading && currentStreak > 0 && (
            <View className="px-4 pb-1 -mt-1">
              <Text className="text-amber-400 text-xs font-semibold tracking-wide">
                🔥 {currentStreak}-day streak
                {activeSeekerBadgeEarned ? ' • Active Seeker' : ''}
              </Text>
              {atRisk && (
                <Text className="text-orange-400 text-[10px] mt-0.5">At risk today — swipe to keep your streak!</Text>
              )}
            </View>
          )}
          <MatchInboxList
            matches={matches}
            isLoading={isLoading}
            error={error}
            role="candidate"
            onCelebrateMatch={handleCelebrateMatch}
          />
        </TabWebShell>
      </AppScreen>

      {/* Match Celebration Overlay */}
      <MatchCelebration
        visible={celebratingMatch !== null}
        match={celebratingMatch}
        userPhotoUrl={profile?.avatar_url ?? null}
        userName={profile?.full_name ?? 'You'}
        role="candidate"
        onSendMessage={handleSendMessage}
        onClose={closeCelebration}
      />
    </>
  );
}
