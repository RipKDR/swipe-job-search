// Northern Melbourne beachhead suburbs for MVP
export const BEACHHEAD_SUBURBS = [
  'Tullamarine',
  'Airport West',
  'Keilor',
  'Keilor East',
  'Avondale Heights',
  'Niddrie',
  'Essendon',
  'Moonee Ponds',
  'Ascot Vale',
  'Pascoe Vale',
  'Coburg',
  'Brunswick',
] as const;

export type BeachheadSuburb = typeof BEACHHEAD_SUBURBS[number];

/**
 * Approximate lat/lng centers for each beachhead suburb (Melbourne, AU).
 * Used for distance calculations when GPS is unavailable.
 */
export const SUBURB_COORDS: Record<string, { lat: number; lng: number }> = {
  'Tullamarine':    { lat: -37.704, lng: 144.881 },
  'Airport West':   { lat: -37.724, lng: 144.885 },
  'Keilor':         { lat: -37.718, lng: 144.826 },
  'Keilor East':    { lat: -37.733, lng: 144.864 },
  'Avondale Heights': { lat: -37.762, lng: 144.863 },
  'Niddrie':        { lat: -37.742, lng: 144.891 },
  'Essendon':       { lat: -37.750, lng: 144.921 },
  'Moonee Ponds':   { lat: -37.767, lng: 144.924 },
  'Ascot Vale':     { lat: -37.778, lng: 144.922 },
  'Pascoe Vale':    { lat: -37.728, lng: 144.946 },
  'Coburg':         { lat: -37.746, lng: 144.966 },
  'Brunswick':      { lat: -37.767, lng: 144.961 },
};
