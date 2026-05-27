// Northern Melbourne beachhead suburbs for MVP
// Per 02-mvp-definition.md beachhead strategy
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

export function isValidSuburb(suburb: string): boolean {
  return BEACHHEAD_SUBURBS.includes(suburb as BeachheadSuburb);
}

// Legacy export for backwards compatibility
export const MELBOURNE_SUBURBS = BEACHHEAD_SUBURBS;
export type MelbourneSuburb = BeachheadSuburb;
