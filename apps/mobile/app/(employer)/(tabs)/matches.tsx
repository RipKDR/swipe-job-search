import { MatchInboxList } from '@/components/chat/MatchInboxList';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TabWebShell } from '@/components/ui/TabWebShell';
import { useMatchInbox } from '@/hooks/useMatchInbox';

export default function EmployerMatchesScreen() {
  const { data: matches = [], isLoading, error } = useMatchInbox();

  return (
    <AppScreen centered={false} maxWidth="tab">
      <TabWebShell>
        <ScreenHeader
          title="Matches"
          subtitle="Active conversations with interested candidates."
        />
        <MatchInboxList matches={matches} isLoading={isLoading} error={error} role="employer" />
      </TabWebShell>
    </AppScreen>
  );
}
