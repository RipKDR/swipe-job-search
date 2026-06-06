import React, { useEffect } from 'react';
import { View, Text, Pressable } from '@/components/tw';
import { Image, Modal, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { InboxMatch } from '@/hooks/useMatchInbox';

/* ── Props ───────────────────────────────────────────────────────────── */

interface MatchCelebrationProps {
  /** Show / hide the overlay. */
  visible: boolean;
  /** The match to celebrate — required when visible=true. */
  match: InboxMatch | null;
  /** Current user's avatar URL (for the left photo). */
  userPhotoUrl: string | null;
  /** Current user's display name. */
  userName: string;
  /** Role used for copy variation. */
  role: 'candidate' | 'employer';
  /** Called when user taps "Send a message". */
  onSendMessage: () => void;
  /** Called when user taps "Propose trial shift". */
  onProposeTrialShift: () => void;
  /** Called when the overlay is dismissed (backdrop tap / close). */
  onClose: () => void;
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .filter((c) => c.length > 0)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function AvatarPlaceholder({ initials }: { initials: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-slate-700">
      <Text className="text-slate-400 text-xl font-bold">{initials}</Text>
    </View>
  );
}

/* ── Component ────────────────────────────────────────────────────────── */

export function MatchCelebration({
  visible,
  match,
  userPhotoUrl,
  userName,
  role,
  onSendMessage,
  onProposeTrialShift,
  onClose,
}: MatchCelebrationProps) {
  const { width: screenWidth } = useWindowDimensions();
  const cardSize = Math.min(screenWidth - 48, 380);

  // ── Entrance animation shared values ──
  const scale = useSharedValue(0.85);
  const translateY = useSharedValue(40);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 14, stiffness: 130 });
      translateY.value = withSpring(0, { damping: 16, stiffness: 150 });
      overlayOpacity.value = withTiming(1, { duration: 300 });
    } else {
      scale.value = 0.85;
      translateY.value = 40;
      overlayOpacity.value = 0;
    }
    // Only run on visible change — not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
    opacity: overlayOpacity.value,
  }));

  if (!match) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* ── Backdrop ── */}
      <Pressable
        onPress={onClose}
        className="flex-1 items-center justify-center bg-black/75 px-6"
      >
        {/* ── Celebration card ── */}
        <Animated.View
          style={[
            cardAnimatedStyle,
            {
              width: cardSize,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: 'rgba(51,65,85,0.5)',
              backgroundColor: '#0f172a',
              alignItems: 'center',
              overflow: 'hidden',
            },
          ]}
        >
          {/* ═══ Top gradient-ish band ═══ */}
          <View className="w-full items-center pt-10 pb-6 px-6 bg-gradient-to-b from-indigo-950/60 to-transparent">
            {/* Close button */}
            <Pressable
              onPress={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-800/80 items-center justify-center active:bg-slate-700"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="text-slate-400 text-base leading-none">✕</Text>
            </Pressable>

            {/* IT'S A MATCH heading */}
            <Text className="text-emerald-400 text-xs font-semibold tracking-[3px] uppercase mb-2">
              {role === 'candidate' ? 'Employer wants to chat' : 'New match'}
            </Text>
            <Text className="text-white text-3xl font-extrabold tracking-tight text-center">
              IT'S A{' '}
              <Text className="text-emerald-400">MATCH</Text>
            </Text>
          </View>

          {/* ═══ Dual photos ═══ */}
          <View className="flex-row items-center justify-center -mt-2">
            {/* Left — current user */}
            <View className="w-[88px] h-[88px] rounded-full border-[3px] border-slate-600 overflow-hidden bg-slate-800 z-10">
              {userPhotoUrl ? (
                <Image
                  source={{ uri: userPhotoUrl }}
                  className="w-full h-full"
                  accessibilityLabel={`${userName}'s avatar`}
                />
              ) : (
                <AvatarPlaceholder initials={getInitials(userName)} />
              )}
            </View>

            {/* Right — counterpart */}
            <View className="w-[88px] h-[88px] rounded-full border-[3px] border-emerald-500 overflow-hidden bg-slate-800 -ml-5 z-20 shadow-lg shadow-emerald-900/40">
              {match.counterpartAvatarUrl ? (
                <Image
                  source={{ uri: match.counterpartAvatarUrl }}
                  className="w-full h-full"
                  accessibilityLabel={`${match.counterpartName}'s avatar`}
                />
              ) : (
                <AvatarPlaceholder initials={getInitials(match.counterpartName)} />
              )}
            </View>
          </View>

          {/* ═══ Names & job details ═══ */}
          <View className="items-center gap-1 px-6 mt-4 mb-2">
            <Text className="text-white text-xl font-semibold text-center">
              {userName} & {match.counterpartName}
            </Text>
            <Text className="text-slate-400 text-sm text-center">
              {match.jobTitle}
            </Text>
            {role === 'candidate' ? (
              <Text className="text-slate-500 text-xs text-center">
                Employer matched for this role
              </Text>
            ) : (
              <Text className="text-slate-500 text-xs text-center">
                Candidate is interested in this role
              </Text>
            )}
          </View>

          {/* ═══ CTA Buttons ═══ */}
          <View className="w-full px-6 pb-6 pt-2 gap-3">
            <Pressable
              onPress={() => {
                onSendMessage();
                onClose();
              }}
              className="w-full py-4 rounded-xl border-2 border-white/20 bg-white/5 items-center active:bg-white/10"
            >
              <Text className="text-white text-base font-semibold">
                Send a message
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                onProposeTrialShift();
                onClose();
              }}
              className="w-full py-4 rounded-xl bg-orange-500 items-center active:bg-orange-600"
            >
              <Text className="text-white text-base font-semibold">
                Propose trial shift
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

export default MatchCelebration;
