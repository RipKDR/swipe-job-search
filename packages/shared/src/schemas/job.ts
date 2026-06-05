// Job Zod schemas per BACKEND.md jobs table
import { z } from 'zod';
import { JOB_TYPES } from '../constants/job-types';

// Job status from BACKEND.md enum
const JobStatusSchema = z.enum(['active', 'hired', 'expired', 'paused']);
export type JobStatus = z.infer<typeof JobStatusSchema>;

// Pay period from BACKEND.md CHECK constraint
const PayPeriodSchema = z.enum(['hour', 'week', 'year']);
export type PayPeriod = z.infer<typeof PayPeriodSchema>;

// Full job schema from BACKEND.md jobs table
export const JobSchema = z.object({
  id: z.string().uuid(),
  employer_id: z.string().uuid(),
  circle_id: z.string().uuid(),
  title: z.string(),
  job_type: z.enum(JOB_TYPES),
  pay_display: z.string(), // Card display: "$32/hr"
  pay_amount: z.number().positive(),
  pay_period: PayPeriodSchema,
  hours_text: z.string(),
  suburb: z.string(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  description: z.string().nullable(),
  photo_url: z.string().url().nullable(),
  status: JobStatusSchema,
  expires_at: z.string(),
  hired_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  // Fields from job aggregator (optional — external jobs have these)
  url: z.string().url().nullable().optional(),
  source: z.string().nullable().optional(),
});

export type Job = z.infer<typeof JobSchema>;
