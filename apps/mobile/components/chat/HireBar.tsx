import type { ReactNode } from 'react';
import { View, Text } from '@/components/tw';
import { Button } from '@/components/ui/Button';
import { getHireBarState, type MatchHireFields } from '@/hooks/useHireConfirm';
import { contentMaxWidthChat, screenPadding } from '@/lib/responsive-layout';

type HireBarProps = {
  match: MatchHireFields;
  userId: string;
  loading?: boolean;
  onConfirmHire: () => void;
};

function HireBarInner({ children, variant }: { children: ReactNode; variant: 'default' | 'closed' | 'hired' | 'awaiting' }) {
  const bg =
    variant === 'hired'
      ? 'bg-emerald-950/40 border-emerald-900'
      : variant === 'awaiting'
        ? 'bg-amber-950/30 border-amber-900'
        : 'bg-slate-900 border-slate-800';
  return (
    <View className={`w-full items-center ${screenPadding} border-t ${bg}`}>
      <View className={`w-full ${contentMaxWidthChat} py-3 gap-2`}>{children}</View>
    </View>
  );
}

export function HireBar({ match, userId, loading, onConfirmHire }: HireBarProps) {
  const state = getHireBarState(match, userId);

  if (state.phase === 'closed') {
    return (
      <HireBarInner variant="closed">
        <Text className="text-slate-400 text-center">This conversation is closed.</Text>
      </HireBarInner>
    );
  }

  if (state.phase === 'hired') {
    return (
      <HireBarInner variant="hired">
        <Text className="text-emerald-300 text-center font-medium">Hired — congratulations!</Text>
      </HireBarInner>
    );
  }

  if (state.phase === 'awaiting_other') {
    return (
      <HireBarInner variant="awaiting">
        <Text className="text-amber-200 text-center">Waiting for the other party to confirm hire.</Text>
      </HireBarInner>
    );
  }

  const buttonTitle = state.phase === 'can_initiate' ? 'Mark as Hired' : 'Confirm Hire';

  return (
    <HireBarInner variant="default">
      {state.phase === 'can_confirm' ? (
        <Text className="text-slate-300 text-center text-sm">
          The other party wants to mark this hire as complete.
        </Text>
      ) : null}
      <Button title={buttonTitle} loading={loading} onPress={onConfirmHire} fullWidth />
    </HireBarInner>
  );
}
