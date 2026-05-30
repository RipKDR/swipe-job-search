/**
 * MatchScoreBadge — Colored badge showing match score with animated entrance.
 *
 * - Green (>=0.7): strong match
 * - Yellow (>=0.4): moderate match
 * - Red (<0.4): weak match
 *
 * Pressing the badge shows a detail popover with matching/missing skills.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  interpolate,
} from 'react-native-reanimated';
import { View, Text, Pressable } from '@/components/tw';

export type ScoreColor = 'green' | 'yellow' | 'red';

function scoreToColor(score: number): ScoreColor {
  if (score >= 0.7) return 'green';
  if (score >= 0.4) return 'yellow';
  return 'red';
}

function scoreToLabel(score: number): string {
  if (score >= 0.7) return 'Strong match';
  if (score >= 0.4) return 'Moderate match';
  return 'Low match';
}

const COLOR_MAP: Record<ScoreColor, { bg: string; text: string; border: string; badge: string }> = {
  green: {
    bg: 'bg-[#052e16]',
    text: 'text-[#86efac]',
    border: 'border-[#166534]',
    badge: 'bg-[#166534]',
  },
  yellow: {
    bg: 'bg-[#422006]',
    text: 'text-[#fde047]',
    border: 'border-[#a16207]',
    badge: 'bg-[#a16207]',
  },
  red: {
    bg: 'bg-[#450a0a]',
    text: 'text-[#fca5a5]',
    border: 'border-[#991b1b]',
    badge: 'bg-[#991b1b]',
  },
};

interface MatchScoreBadgeProps {
  score: number;
  matchingSkills?: string[];
  missingSkills?: string[];
  /** Delay in ms before the entrance animation fires (for stacked cards) */
  entranceDelay?: number;
  /** Compact version for inline display (no pill, just dot) */
  compact?: boolean;
}

export function MatchScoreBadge({
  score,
  matchingSkills = [],
  missingSkills = [],
  entranceDelay = 0,
  compact = false,
}: MatchScoreBadgeProps) {
  const [showPopover, setShowPopover] = useState(false);
  const animatedValue = useSharedValue(0);

  // Entrance animation
  useEffect(() => {
    animatedValue.value = withDelay(entranceDelay, withSpring(1, { damping: 12, stiffness: 120 }));
  }, [entranceDelay, animatedValue]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: animatedValue.value,
    transform: [
      {
        scale: interpolate(animatedValue.value, [0, 1], [0.5, 1]),
      },
    ],
  }));

  const color = scoreToColor(score);
  const colors = COLOR_MAP[color];
  const label = scoreToLabel(score);
  const percent = Math.round(score * 100);

  const handlePress = useCallback(() => {
    setShowPopover((prev) => !prev);
  }, []);

  const handleDismiss = useCallback(() => {
    setShowPopover(false);
  }, []);

  if (compact) {
    return (
      <Animated.View style={animatedStyle}>
        <View className={`w-2 h-2 rounded-full ${colors.badge}`} />
      </Animated.View>
    );
  }

  return (
    <>
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={`Match score: ${percent}%. ${label}. ${matchingSkills.length} matching skills, ${missingSkills.length} missing skills. Tap for details.`}
          className={`px-2.5 py-1 rounded-full border ${colors.border} ${colors.bg} flex-row items-center gap-1.5 active:opacity-80`}
        >
          {/* Dot indicator */}
          <View className={`w-1.5 h-1.5 rounded-full ${colors.text}`} />

          {/* Score text */}
          <Text className={`text-[11px] font-bold tabular-nums ${colors.text}`}>{percent}%</Text>
        </Pressable>
      </Animated.View>

      {/* Detail popover */}
      <Modal
        visible={showPopover}
        transparent
        animationType="fade"
        onRequestClose={handleDismiss}
      >
        <Pressable
          onPress={handleDismiss}
          className="flex-1 bg-black/60 items-center justify-center"
        >
          <Pressable
            onPress={(e: any) => e.stopPropagation?.()}
            className={`mx-6 w-full max-w-sm rounded-2xl border ${colors.border} ${colors.bg} p-5`}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-2">
                <View className={`w-3 h-3 rounded-full ${colors.text}`} />
                <Text className={`text-lg font-bold ${colors.text}`}>{percent}%</Text>
              </View>
              <Text className={`text-xs font-medium ${colors.text} opacity-70`}>{label}</Text>
            </View>

            {/* Score bar */}
            <View className="h-2 bg-white/10 rounded-full mb-4 overflow-hidden">
              <View
                className={`h-full rounded-full ${colors.badge}`}
                style={{ width: `${Math.max(2, percent)}%` }}
              />
            </View>

            {/* Matching skills */}
            {matchingSkills.length > 0 && (
              <View className="mb-3">
                <Text className="text-white text-xs font-semibold mb-1.5">
                  ✅ Matching skills ({matchingSkills.length})
                </Text>
                <View className="flex-row flex-wrap gap-1">
                  {matchingSkills.map((skill) => (
                    <View
                      key={skill}
                      className="px-2 py-0.5 rounded-full bg-[#166534]/40 border border-[#22c55e]/30"
                    >
                      <Text className="text-[#86efac] text-[11px]">{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Missing skills */}
            {missingSkills.length > 0 && (
              <View>
                <Text className="text-white text-xs font-semibold mb-1.5">
                  ⬜ Missing skills ({missingSkills.length})
                </Text>
                <View className="flex-row flex-wrap gap-1">
                  {missingSkills.map((skill) => (
                    <View
                      key={skill}
                      className="px-2 py-0.5 rounded-full bg-[#991b1b]/40 border border-[#ef4444]/30"
                    >
                      <Text className="text-[#fca5a5] text-[11px]">{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Empty state */}
            {matchingSkills.length === 0 && missingSkills.length === 0 && (
              <View className="py-4">
                <Text className="text-white/50 text-xs text-center italic">
                  No skill data available for comparison
                </Text>
              </View>
            )}

            {/* Dismiss hint */}
            <Text className="text-white/40 text-[10px] text-center mt-4">Tap anywhere to close</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default MatchScoreBadge;
