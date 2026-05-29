import React from 'react';
import { View, Text } from '@/components/tw';
import { Button } from '@/components/ui/Button';

export type InterestedActionState = 'idle' | 'matching' | 'already_matched' | 'error';

type InterestedCardProps = {
  candidateId: string;
  fullName: string;
  suburb: string;
  skills: string[];
  actionState?: InterestedActionState;
  onChat: (candidateId: string) => void;
};

function InterestedCardRaw({
  candidateId,
  fullName,
  suburb,
  skills,
  actionState = 'idle',
  onChat,
}: InterestedCardProps) {
  const isBusy = actionState === 'matching';
  const isAlreadyMatched = actionState === 'already_matched';
  const isDisabled = isBusy || isAlreadyMatched;
  const ctaText = isBusy ? 'Connecting…' : isAlreadyMatched ? 'Already matched' : 'Start chat';

  return (
    <View className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 gap-3">
      <View>
        <Text className="text-white text-lg font-semibold">{fullName}</Text>
        <Text className="text-slate-400 mt-1">{suburb}</Text>
        <Text className="text-slate-300 mt-2 text-sm">
          {skills.length > 0 ? skills.join(' · ') : 'No skills listed'}
        </Text>
      </View>
      <Button title={ctaText} disabled={isDisabled} fullWidth onPress={() => onChat(candidateId)} />
    </View>
  );
}

const comparator = (prev: InterestedCardProps, next: InterestedCardProps) =>
  prev.actionState === next.actionState && prev.candidateId === next.candidateId;

export const InterestedCard = React.memo(InterestedCardRaw, comparator);
export default InterestedCard;
