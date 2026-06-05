/**
 * CommuteBadge — a minimal badge showing "X min drive" in grey.
 *
 * Only renders when `commuteMinutes` is available.
 * Fades in with an opacity animation when data arrives.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Text } from 'react-native';

interface CommuteBadgeProps {
  /** Estimated driving duration in minutes. */
  minutes: number;
}

/**
 * A small grey badge showing estimated driving time.
 *
 * Fades in gently when the value is set (or changes), making it
 * feel like a live computation rather than a sudden pop-in.
 */
export function CommuteBadge({ minutes }: CommuteBadgeProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in whenever `minutes` is set or changes
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [minutes, opacity]);

  const label = minutes < 60
    ? `${minutes} min drive`
    : `${Math.floor(minutes / 60)}h ${minutes % 60}m drive`;

  return (
    <Animated.View
      style={{ opacity }}
      className="px-2.5 py-1 bg-[#6b665f]/80 rounded-full"
    >
      <Text className="text-[#f4f0e9] text-[10px] font-medium tracking-wide">
        {label}
      </Text>
    </Animated.View>
  );
}

export default CommuteBadge;
