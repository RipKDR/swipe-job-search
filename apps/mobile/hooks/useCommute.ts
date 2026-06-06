/**
 * useCommute — debounced commute time estimation for a job location.
 *
 * Queries the OSRM API (with haversine fallback) to estimate driving
 * duration from the user's current location to a job's coordinates.
 *
 * Debouncing: avoids firing API calls while the user is actively swiping
 * through cards (2s quiet period after last job-location change).
 *
 * Memoization: results are cached per job coordinate pair so re-rendering
 * the same job (e.g. after a bounce-back) does not re-fetch.
 */

import { useEffect, useRef, useState } from 'react';
import { useUserLocation } from '@/hooks/useUserLocation';
import { computeTransitTime, type CommuteResult } from '@/lib/commute';

/** Debounce interval in milliseconds before firing the OSRM request. */
const DEBOUNCE_MS = 2_000;

/**
 * Module-level LRU-ish cache keyed by `${lat},${lng}` so identical
 * job locations across renders and cards don't trigger duplicate fetches.
 * Max 50 entries to avoid unbounded memory use.
 */
const COMMUTE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { result: CommuteResult; timestamp: number }>();
const MAX_CACHE = 50;

/** Clear all cached commute results. Useful for tests or manual invalidation. */
export function clearCommuteCache(): void {
  cache.clear();
}

function getCacheKey(lat: number, lng: number): string {
  // Round to 4 decimal places (~11 m precision) — small enough for commute
  // estimation but avoids cache misses from floating-point jitter.
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function setCached(lat: number, lng: number, result: CommuteResult): void {
  const key = getCacheKey(lat, lng);
  if (cache.size >= MAX_CACHE) {
    // Evict oldest entry (first key inserted)
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { result, timestamp: Date.now() });
}

function getCached(lat: number, lng: number): CommuteResult | undefined {
  const entry = cache.get(getCacheKey(lat, lng));
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > COMMUTE_CACHE_TTL) {
    cache.delete(getCacheKey(lat, lng));
    return undefined;
  }
  return entry.result;
}

export interface UseCommuteResult {
  /** Estimated driving duration in minutes, or null while loading / unavailable. */
  commuteMinutes: number | null;
  /** True while the OSRM request is in flight (includes debounce window). */
  isLoading: boolean;
}

/**
 * Estimate commute time from user's current location to a job location.
 *
 * @param jobLat  Job latitude (or null if unknown).
 * @param jobLng  Job longitude (or null if unknown).
 *
 * @returns `{ commuteMinutes, isLoading }`.
 *
 * The API call is debounced by 2 seconds — when the user rapidly swipes
 * through jobs, only the last job's coordinates trigger a fetch.
 * Results are cached per coordinate pair to avoid redundant API calls.
 */
export function useCommute(
  jobLat: number | null,
  jobLng: number | null,
): UseCommuteResult {
  const { location: userLocation, isLoading: isUserLoading } = useUserLocation();

  const [state, setState] = useState<{ commuteMinutes: number | null; isLoading: boolean }>({
    commuteMinutes: null,
    isLoading: false,
  });

  // Ref to track active request so stale responses are ignored
  const activeRequestRef = useRef<symbol | null>(null);
  // Ref for the debounce timer
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any pending debounce from a previous render
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    // Not enough data to compute
    if (
      jobLat == null ||
      jobLng == null ||
      !userLocation ||
      isUserLoading
    ) {
      setState({ commuteMinutes: null, isLoading: false });
      return;
    }

    // Check cache first (instant response, no loading state)
    const cached = getCached(jobLat, jobLng);
    if (cached) {
      setState({ commuteMinutes: cached.duration_minutes, isLoading: false });
      return;
    }

    // Start debounce window — show loading but don't fire API yet
    setState((prev) => ({ ...prev, isLoading: true }));

    const requestId = Symbol();
    activeRequestRef.current = requestId;

    debounceRef.current = setTimeout(async () => {
      // Guard: another effect cycle invalidated this request
      if (activeRequestRef.current !== requestId) return;

      const result = await computeTransitTime(
        userLocation.latitude,
        userLocation.longitude,
        jobLat,
        jobLng,
      );

      // Guard: component unmounted or another request superseded this one
      if (activeRequestRef.current !== requestId) return;

      if (result) {
        setCached(jobLat, jobLng, result);
        setState({ commuteMinutes: result.duration_minutes, isLoading: false });
      } else {
        setState({ commuteMinutes: null, isLoading: false });
      }

      activeRequestRef.current = null;
    }, DEBOUNCE_MS);

    return () => {
      // Cleanup on unmount or before next effect run
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      activeRequestRef.current = null;
    };
  }, [jobLat, jobLng, userLocation, isUserLoading]);

  return state;
}
