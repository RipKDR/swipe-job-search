/**
 * OSRM-based transit time estimation for the commute calculator.
 *
 * Primary: queries the OSRM demo server (router.project-osrm.org) for
 * driving duration between two coordinates.
 * Fallback: estimates from haversine distance assuming 40 km/h average speed
 * when the OSRM API is unavailable (graceful degradation — no commute shown).
 */

import { haversineDistance } from '@/lib/distance';

/** Average speed used for fallback estimation when OSRM is unavailable (km/h). */
const FALLBACK_SPEED_KMH = 40;

/** OSRM demo server endpoint (rate-limited, not for production use). */
const OSRM_BASE = 'https://router.project-osrm.org/route/v1';

/** Timeout for the OSRM fetch in milliseconds. */
const OSRM_TIMEOUT_MS = 5_000;

export interface CommuteResult {
  /** Total driving duration in minutes (rounded). */
  duration_minutes: number;
  /** Total route distance in kilometres (rounded to 1 decimal). */
  distance_km: number;
  /** Travel mode used for estimation. */
  mode: 'driving';
}

/**
 * Call the OSRM demo server for a driving route between two points.
 *
 * @returns parsed route data or null on any network/parse error.
 */
async function fetchOsrmRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<{ duration: number; distance: number } | null> {
  try {
    // OSRM expects coordinates in lon,lat order
    const url =
      `${OSRM_BASE}/driving/${originLng},${originLat};${destLng},${destLat}` +
      `?overview=false&alternatives=false&steps=false`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[commute] OSRM returned ${res.status}`);
      return null;
    }

    const body = await res.json();

    if (body?.code !== 'Ok' || !body?.routes?.length) {
      console.warn('[commute] OSRM returned non-Ok response', body?.code);
      return null;
    }

    const route = body.routes[0];
    return {
      duration: route.duration, // seconds
      distance: route.distance, // metres
    };
  } catch (err: any) {
    // Network error, timeout, or parse failure — graceful degradation
    if (err?.name === 'AbortError') {
      console.warn('[commute] OSRM request timed out');
    } else {
      console.warn('[commute] OSRM request failed:', err?.message);
    }
    return null;
  }
}

/**
 * Compute driving time between two coordinates.
 *
 * Uses the OSRM demo server for the primary estimate. Falls back to a
 * haversine-based estimate at 40 km/h average speed if the API call fails.
 * Returns null only when input coordinates are invalid.
 *
 * @returns CommuteResult with duration in minutes and distance in km,
 *          or null if coordinates are invalid.
 */
export async function computeTransitTime(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<CommuteResult | null> {
  if (
    !isFinite(originLat) || !isFinite(originLng) ||
    !isFinite(destLat) || !isFinite(destLng)
  ) {
    return null;
  }

  // 1. Try OSRM
  const osrm = await fetchOsrmRoute(originLat, originLng, destLat, destLng);

  if (osrm) {
    return {
      duration_minutes: Math.round(osrm.duration / 60),
      distance_km: Math.round((osrm.distance / 1000) * 10) / 10,
      mode: 'driving',
    };
  }

  // 2. Fallback: estimate from haversine distance @ 40 km/h
  const distanceKm = haversineDistance(originLat, originLng, destLat, destLng);

  if (distanceKm <= 0) {
    return null;
  }

  const durationMinutes = Math.round((distanceKm / FALLBACK_SPEED_KMH) * 60);

  return {
    duration_minutes: Math.max(1, durationMinutes),
    distance_km: distanceKm,
    mode: 'driving',
  };
}
