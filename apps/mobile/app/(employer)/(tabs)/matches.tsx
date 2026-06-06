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

export default function EmployerMatchesScreen() {
  const { data: matches = [], isLoading, error } = useMatchInbox();
  const { profile } = useAuth();
  const router = useRouter();

  // ── Match celebration state ──
  const [celebratingMatch, setCelebratingMatch] = useState<InboxMatch | null>(null);

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
            subtitle="Active conversations with interested candidates."
          />
          <MatchInboxList
            matches={matches}
            isLoading={isLoading}
            error={error}
            role="employer"
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
        role="employer"
        onSendMessage={handleSendMessage}
        onClose={closeCelebration}
      />
    </>
  );
}
