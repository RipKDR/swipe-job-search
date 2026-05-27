// Job types per BACKEND.md enum
export const JOB_TYPES = ['casual', 'part_time', 'permanent'] as const;

export type JobType = typeof JOB_TYPES[number];

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  casual: 'Casual',
  part_time: 'Part-time',
  permanent: 'Permanent',
};

export function isValidJobType(type: string): type is JobType {
  return JOB_TYPES.includes(type as JobType);
}
