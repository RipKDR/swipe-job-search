import type { JobType } from './job-types';
import { JOB_TYPE_LABELS } from './job-types';
import type { PayPeriod } from '../schemas/job';

/** 2026 hospitality/retail beachhead advisory baseline (Melbourne north). */
export const FAIR_WORK_BASELINE_HOURLY_2026 = 24.1;

/** Official Fair Work Pay Calculator — link in employer warnings only. */
export const FAIR_WORK_PAY_CALCULATOR_URL =
  'https://www.fairwork.gov.au/pay-and-wages/minimum-wages/pay-calculator';

/**
 * Advisory hourly minimums by job type (2026 beachhead).
 * Per AU_FAIR_WORK doc: warn only — do not block posting.
 */
export const FAIR_WORK_HOURLY_MINIMUMS: Record<JobType, number> = {
  casual: FAIR_WORK_BASELINE_HOURLY_2026,
  part_time: FAIR_WORK_BASELINE_HOURLY_2026,
  permanent: FAIR_WORK_BASELINE_HOURLY_2026,
};

export function getFairWorkHourlyMinimum(jobType: JobType): number {
  return FAIR_WORK_HOURLY_MINIMUMS[jobType];
}

/** Hourly pay only; non-hourly periods never trigger a warning. */
export function isBelowFairWorkMinimum(
  payAmount: number,
  payPeriod: PayPeriod,
  jobType: JobType
): boolean {
  if (payPeriod !== 'hour') {
    return false;
  }
  return payAmount < getFairWorkHourlyMinimum(jobType);
}

export function fairWorkWarningMessage(jobType: JobType): string {
  const min = getFairWorkHourlyMinimum(jobType);
  const label = JOB_TYPE_LABELS[jobType].toLowerCase();
  return `This hourly rate is below the typical ${label} award minimum (~$${min.toFixed(2)}/hr). Check the Fair Work Pay Calculator (${FAIR_WORK_PAY_CALCULATOR_URL}) before posting.`;
}
