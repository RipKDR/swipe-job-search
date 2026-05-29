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

type BeachheadSuburb = typeof BEACHHEAD_SUBURBS[number];
