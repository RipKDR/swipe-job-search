/**
 * Saved Jobs Screen — Displays all bookmarked jobs with search/filter.
 *
 * Wires useSavedJobs hook with SavedJobsList component.
 * Handles: loading → skeleton, empty → empty state, error → error + retry,
 * and full list with pull-to-refresh, search bar, and filter chips.
 *
 * @see bookmarks-maya-handoff.md §4
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text } from '@/components/tw';
import { useSavedJobs } from '@/hooks/useSavedJobs';
import { SavedJobsList } from '@/components/bookmarks/SavedJobsList';
import { SavedJobsSkeleton } from '@/components/bookmarks/SavedJobsSkeleton';
import { SavedJobsEmpty } from '@/components/bookmarks/SavedJobsEmpty';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TabWebShell } from '@/components/ui/TabWebShell';
import { useTheme } from '@/providers/ThemeProvider';
import { type FilterKey } from '@/components/bookmarks/SavedJobsSearchBar';
import type { SavedJob } from '@/hooks/useSavedJobs';
import { Button } from '@/components/ui/Button';

export default function SavedJobsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    savedJobs,
    isLoading,
    isError,
    error,
    isFetching,
    removeBookmark,
    refresh,
  } = useSavedJobs();

  // ─── Local UI state ─────────────────────────────────────────────────────

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  // ─── Derived: filter + search ──────────────────────────────────────────

  const filteredJobs = useMemo<SavedJob[]>(() => {
    let result = savedJobs;

    if (activeFilter !== 'all') {
      result = result.filter((j) => j.job_type === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          (j.employer_name ?? '').toLowerCase().includes(q) ||
          j.suburb.toLowerCase().includes(q),
      );
    }

    return result;
  }, [savedJobs, activeFilter, searchQuery]);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleJobPress = useCallback(
    (jobId: string) => {
      router.push(`/(candidate)/job/${jobId}` as any);
    },
    [router],
  );

  const handleRemove = useCallback(
    async (jobId: string) => {
      await removeBookmark(jobId);
    },
    [removeBookmark],
  );

  const handleBrowse = useCallback(() => {
    router.push('/(candidate)/(tabs)/deck' as any);
  }, [router]);

  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  // ─── Loading state ──────────────────────────────────────────────────────

  if (isLoading && savedJobs.length === 0) {
    return <SavedJobsSkeleton />;
  }

  // ─── Error state (with retry) ──────────────────────────────────────────

  if (isError && savedJobs.length === 0) {
    return (
      <AppScreen centered maxWidth="lg">
        <View
          className="flex-1 items-center justify-center px-8 py-12"
          style={{ backgroundColor: colors.background }}
        >
          <Text className="text-5xl mb-5">⚠️</Text>
          <Text
            style={{
              color: colors.text,
              fontSize: 20,
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            Couldn&apos;t load saved jobs
          </Text>
          <Text
            style={{
              color: colors.muted,
              textAlign: 'center',
              marginTop: 8,
              fontSize: 14,
              lineHeight: 20,
              maxWidth: 280,
            }}
          >
            {error || 'There was a problem fetching your saved jobs.'}
          </Text>
          <Button
            title="Try again"
            onPress={handleRefresh}
            variant="outline"
            className="mt-8"
          />
        </View>
      </AppScreen>
    );
  }

  // ─── Empty state (no bookmarks at all) ──────────────────────────────────

  if (savedJobs.length === 0 && !isLoading) {
    return (
      <AppScreen centered maxWidth="lg">
        <SavedJobsEmpty onBrowse={handleBrowse} />
      </AppScreen>
    );
  }

  // ─── Main list ─────────────────────────────────────────────────────────

  return (
    <AppScreen centered={false}>
      <TabWebShell>
        <View className="px-4 sm:px-6 lg:px-8 max-w-4xl self-center w-full pt-4">
          <ScreenHeader
            title="Saved"
            subtitle="Jobs you bookmarked for later"
          />
        </View>

        <SavedJobsList
          savedJobs={savedJobs}
          filteredJobs={filteredJobs}
          isLoading={isLoading}
          isError={isError}
          error={error}
          isFetching={isFetching}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onRefresh={handleRefresh}
          onJobPress={handleJobPress}
          onRemove={handleRemove}
          onBrowse={handleBrowse}
        />
      </TabWebShell>
    </AppScreen>
  );
}
