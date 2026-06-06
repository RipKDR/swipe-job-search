import React, { useCallback } from 'react';
import { FlatList, useWindowDimensions } from 'react-native';
import { View, Text, Pressable } from '@/components/tw';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useRouter, type Href } from 'expo-router';
import type { InboxMatch } from '@/hooks/useMatchInbox';
import { EmptyState } from '@/components/ui/EmptyState';
import { useListColumns } from '@/hooks/useListColumns';
import { BREAKPOINTS, contentMaxWidthLg } from '@/lib/responsive-layout';

type MatchListItemProps = {
  match: InboxMatch;
  numColumns: number;
  onPress: (id: string) => void;
  role: 'candidate' | 'employer';
};

const MatchListItem = React.memo(function MatchListItem({
  match,
  numColumns,
  onPress,
  role,
}: MatchListItemProps) {
  return (
    <Pressable
      onPress={() => onPress(match.id)}
      className={`rounded-2xl bg-slate-900/90 border border-slate-800 p-4 gap-2 active:bg-slate-800/90 ${numColumns > 1 ? 'flex-1 min-w-0' : ''}`}
      style={numColumns > 1 ? { flex: 1 } : undefined}
    >
      {match.isNewMatch ? (
        <Text className="text-indigo-400 text-xs font-semibold tracking-wide uppercase">
          {role === 'candidate' ? 'Employer wants to chat' : 'New match'}
        </Text>
      ) : null}
      <Text className="text-white text-lg font-semibold">{match.counterpartName}</Text>
      <Text className="text-slate-400">{match.jobTitle}</Text>
      <Text className="text-slate-300 mt-1" numberOfLines={1}>
        {match.lastMessagePreview ?? 'Tap to open chat'}
      </Text>
      {match.status === 'hire_pending' ? (
        <Text className="text-amber-400 text-sm mt-1 font-medium">Hire confirmation pending</Text>
      ) : null}
    </Pressable>
  );
});

type MatchInboxListProps = {
  matches: InboxMatch[];
  isLoading?: boolean;
  error?: unknown;
  role: 'candidate' | 'employer';
  /** When set, new-match taps call this callback instead of navigating to chat.
   *  The parent can then show a celebration overlay and decide when to navigate. */
  onCelebrateMatch?: (match: InboxMatch) => void;
};

export function MatchInboxList({ matches, isLoading, error, role, onCelebrateMatch }: MatchInboxListProps) {
  const router = useRouter();
  const numColumns = useListColumns(2);
  const { width } = useWindowDimensions();
  const isWide = width >= BREAKPOINTS.md;

  const handleMatchPress = useCallback(
    (id: string) => {
      const match = matches.find((m) => m.id === id);
      if (match?.isNewMatch && onCelebrateMatch) {
        // Let the parent show the celebration overlay first
        onCelebrateMatch(match);
      } else {
        router.push(`/chat/${id}` as Href);
      }
    },
    [router, matches, onCelebrateMatch],
  );

  const renderItem = useCallback(
    ({ item }: { item: InboxMatch }) => (
      <MatchListItem
        match={item}
        numColumns={numColumns}
        onPress={handleMatchPress}
        role={role}
      />
    ),
    [numColumns, handleMatchPress, role],
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center py-16">
        <Text className="text-slate-400">Loading matches…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <EmptyState
        emoji="⚠️"
        title="Could not load matches"
        description="Pull to refresh or try again shortly."
      />
    );
  }

  if (matches.length === 0) {
    return (
      <EmptyState
        emoji="💬"
        title="No active matches yet"
        description={
          role === 'candidate'
            ? 'When an employer starts a chat, it will appear here.'
            : 'Tap Chat on an interested candidate to start a conversation.'
        }
      />
    );
  }

  const horizontalPad = isWide ? 24 : 16;
  const columnGap = isWide ? 12 : 0;

  return (
    <View className={`flex-1 w-full ${contentMaxWidthLg}`}>
      <ErrorBoundary fallback={<Text className="text-slate-400 p-4">Something went wrong here.</Text>}>
        <FlatList
          data={matches}
          numColumns={numColumns}
          keyExtractor={(item: InboxMatch) => item.id}
          columnWrapperStyle={numColumns > 1 ? { gap: columnGap, paddingHorizontal: horizontalPad } : undefined}
          contentContainerStyle={{
            paddingHorizontal: numColumns > 1 ? 0 : horizontalPad,
            paddingBottom: 24,
            gap: 12,
          }}
          renderItem={renderItem}
        />
      </ErrorBoundary>
    </View>
  );
}
