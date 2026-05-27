// Work rights options for candidates
// Per 02-mvp-definition.md signup fields
export const WORK_RIGHTS = [
  'citizen',
  'pr',
  'visa_student_20hr',
  'visa_working_holiday',
  'visa_skilled',
] as const;

export type WorkRights = typeof WORK_RIGHTS[number];

export const WORK_RIGHTS_LABELS: Record<WorkRights, string> = {
  citizen: 'Australian Citizen',
  pr: 'Permanent Resident',
  visa_student_20hr: 'Student Visa (20hrs/week)',
  visa_working_holiday: 'Working Holiday Visa',
  visa_skilled: 'Skilled Work Visa',
};

export const WORK_RIGHTS_OPTIONS = WORK_RIGHTS.map((value) => ({
  value,
  label: WORK_RIGHTS_LABELS[value],
}));
