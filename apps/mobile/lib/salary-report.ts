/**
 * salary-report.ts - functions for submitting salary reports to the salary_reports table.
 * Used by the PostHireSurvey component and potentially other surfaces.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@hi-hired/shared';

export type ReportType = 'actual' | 'offer' | 'estimate';

export interface SubmitSalaryReportInput {
  jobId: string;
  hourlyRate: number;
  reportType?: ReportType;
}

export interface SalaryReportResult {
  success: boolean;
  error?: string;
}

function mapError(message?: string): string {
  if (!message) return 'Unable to submit salary report right now';
  if (message.includes('violates row-level security')) {
    return 'You must be signed in to submit a salary report';
  }
  if (message.includes('violates foreign key')) {
    return 'The job was not found';
  }
  return message;
}

/**
 * Submit a salary report for a given job.
 * Requires the user to be authenticated.
 * The reported_by field is set from the authenticated user's ID.
 */
export async function submitSalaryReport(
  supabase: SupabaseClient<Database>,
  jobId: string,
  hourlyRate: number,
  reportType: ReportType = 'actual',
): Promise<SalaryReportResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'You must be signed in to submit a salary report' };
    }

    const { error } = await (supabase as any)
      .from('salary_reports')
      .insert({
        job_id: jobId,
        hourly_rate: hourlyRate,
        report_type: reportType,
        reported_by: user.id,
      });

    if (error) {
      return { success: false, error: mapError(error.message) };
    }

    return { success: true };
  } catch (e: any) {
    console.warn('[salaryReport] submit failed:', e?.message);
    return { success: false, error: mapError(e?.message) };
  }
}

/**
 * Validate a salary report input before submission.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateSalaryReport(input: SubmitSalaryReportInput): string | null {
  if (!input.jobId) return 'Job ID is required';
  if (!input.hourlyRate || input.hourlyRate <= 0) return 'Hourly rate must be greater than zero';
  if (input.hourlyRate > 500) return 'Hourly rate seems too high — please check the value';
  if (input.reportType && !['actual', 'offer', 'estimate'].includes(input.reportType)) {
    return 'Report type must be actual, offer, or estimate';
  }
  return null;
}
