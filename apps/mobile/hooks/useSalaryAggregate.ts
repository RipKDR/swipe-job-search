/**
 * useSalaryAggregate - fetches salary aggregate data for a given job
 * from the salary_aggregates materialized view.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@hi-hired/shared';

export type SalaryAggregate = Database['public']['Views']['salary_aggregates']['Row'];

/**
 * Fetch the salary aggregate for a specific job from the materialized view.
 * Returns null if no reports exist yet.
 */
export async function fetchSalaryAggregate(jobId: string): Promise<SalaryAggregate | null> {
  const { data, error } = await (supabase as any)
    .from('salary_aggregates')
    .select('*')
    .eq('job_id', jobId)
    .maybeSingle();

  if (error) {
    console.warn('[useSalaryAggregate] query failed:', error.message);
    return null;
  }

  return data as SalaryAggregate | null;
}

/**
 * React hook to fetch and cache salary aggregate for a given job.
 * Returns null before data is available or when no reports exist.
 * Refetches every 5 minutes to pick up new reports.
 */
export function useSalaryAggregate(jobId: string | undefined) {
  return useQuery<SalaryAggregate | null>({
    queryKey: ['salary-aggregate', jobId],
    queryFn: () => fetchSalaryAggregate(jobId!),
    enabled: !!jobId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Format the aggregate data into a human-readable string.
 * Returns null when no data is available.
 */
export function formatSalaryAggregate(aggregate: SalaryAggregate | null): string | null {
  if (!aggregate || aggregate.report_count === 0) return null;

  const avg = aggregate.avg_hourly_rate;
  const count = aggregate.report_count;

  if (count === 1) {
    return `$${avg.toFixed(2)}/hr from ${count} report`;
  }

  return `Avg $${avg.toFixed(2)}/hr from ${count} reports`;
}

/**
 * Format the aggregate with range for richer display.
 */
export function formatSalaryAggregateDetailed(aggregate: SalaryAggregate | null): string | null {
  if (!aggregate || aggregate.report_count === 0) return null;

  const avg = aggregate.avg_hourly_rate;
  const min = aggregate.min_hourly_rate;
  const max = aggregate.max_hourly_rate;
  const count = aggregate.report_count;

  if (count === 1) {
    return `$${avg.toFixed(2)}/hr`;
  }

  return `Avg $${avg.toFixed(2)}/hr · Range $${min.toFixed(2)}–$${max.toFixed(2)} · ${count} reports`;
}
