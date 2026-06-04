import React from 'react';
import { View, Text, Pressable } from '@/components/tw';
import { Image } from 'react-native';
import { Button } from '@/components/ui/Button';

export type InterestedActionState = 'idle' | 'matching' | 'already_matched' | 'error';

type InterestedCardProps = {
  candidateId: string;
  fullName: string;
  suburb: string;
  skills: string[];
  avatarUrl?: string | null;
  actionState?: InterestedActionState;
  onChat: (candidateId: string) => void;
  onViewProfile?: (candidateId: string) => void;
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .filter((c) => c.length > 0)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function InterestedCardRaw({
  candidateId,
  fullName,
  suburb,
  skills,
  avatarUrl,
  actionState = 'idle',
  onChat,
  onViewProfile,
}: InterestedCardProps) {
  const isBusy = actionState === 'matching';
  const isAlreadyMatched = actionState === 'already_matched';
  const isDisabled = isBusy || isAlreadyMatched;
  const ctaText = isBusy ? 'Connecting…' : isAlreadyMatched ? 'Already matched' : 'Start chat';

  const handlePressProfile = () => {
    if (onViewProfile) onViewProfile(candidateId);
  };

  return (
    <View className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 gap-3">
      <Pressable onPress={handlePressProfile} className="active:opacity-70">
        <View className="flex-row items-center gap-3">
          {/* Avatar */}
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              className="w-12 h-12 rounded-full"
              accessibilityLabel={`${fullName}'s avatar`}
            />
          ) : (
            <View className="w-12 h-12 rounded-full bg-slate-700 items-center justify-center">
              <Text className="text-slate-300 text-sm font-bold">{getInitials(fullName)}</Text>
            </View>
          )}
          {/* Name & suburb */}
          <View className="flex-1">
            <Text className="text-white text-lg font-semibold">{fullName}</Text>
            <Text className="text-slate-400 mt-0.5">{suburb}</Text>
          </View>
        </View>
        {/* Skills */}
        <Text className="text-slate-300 mt-2 text-sm">
          {skills.length > 0 ? skills.join(' · ') : 'No skills listed'}
        </Text>
      </Pressable>
      <Button title={ctaText} disabled={isDisabled} fullWidth onPress={() => onChat(candidateId)} />
    </View>
  );
}

const comparator = (prev: InterestedCardProps, next: InterestedCardProps) =>
  prev.actionState === next.actionState &&
  prev.candidateId === next.candidateId &&
  prev.avatarUrl === next.avatarUrl &&
  prev.fullName === next.fullName &&
  prev.suburb === next.suburb &&
  prev.skills === next.skills;

export const InterestedCard = React.memo(InterestedCardRaw, comparator);
export default InterestedCard;
