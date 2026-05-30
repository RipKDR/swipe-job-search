/**
 * Distance calculation utilities for GPS proximity filtering.
 *
 * Uses the Haversine formula to compute great-circle distances
 * between two lat/lng points on the Earth's surface.
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Convert degrees to radians.
 */
function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Compute approximate distance in kilometres between two lat/lng pairs
 * using the Haversine formula.
 *
 * Returns a positive number rounded to one decimal place.
 * Returns 0 when input is invalid or the coordinates are identical.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  if (
    !isFinite(lat1) || !isFinite(lng1) ||
    !isFinite(lat2) || !isFinite(lng2)
  ) {
    return 0;
  }

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(c * EARTH_RADIUS_KM * 10) / 10;
}

/**
 * Filter an array of jobs to only those within `radiusKm` of the given origin.
 * Jobs without lat/lng data are excluded when filtering is active.
 *
 * Returns the filtered array.
 */
export function filterJobsByDistance<T extends { lat?: number | null; lng?: number | null }>(
  jobs: T[],
  originLat: number,
  originLng: number,
  radiusKm: number,
): T[] {
  if (!jobs.length || !isFinite(originLat) || !isFinite(originLng) || radiusKm <= 0) {
    return jobs;
  }

  return jobs.filter((job) => {
    if (job.lat == null || job.lng == null) return false;
    const d = haversineDistance(originLat, originLng, job.lat, job.lng);
    return d <= radiusKm;
  });
}

/**
 * Compute distance string for display on a JobCard.
 * Returns e.g. "3.2 km away" or null if either position is unavailable.
 */
export function formatDistance(
  jobLat: number | null | undefined,
  jobLng: number | null | undefined,
  userLat: number | null | undefined,
  userLng: number | null | undefined,
): string | null {
  if (
    jobLat == null || jobLng == null ||
    userLat == null || userLng == null
  ) {
    return null;
  }
  const d = haversineDistance(userLat, userLng, jobLat, jobLng);
  if (d < 1) {
    return `${Math.round(d * 1000)} m away`;
  }
  return `${d} km away`;
}
