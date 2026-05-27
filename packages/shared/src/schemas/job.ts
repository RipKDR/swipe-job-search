// Job Zod schemas per BACKEND.md jobs table
import { z } from 'zod';
import { JOB_TYPES } from '../constants/job-types';
import { BEACHHEAD_SUBURBS } from '../constants';

// Job status from BACKEND.md enum
export const JobStatusSchema = z.enum(['active', 'hired', 'expired', 'paused']);
export type JobStatus = z.infer<typeof JobStatusSchema>;

// Pay period from BACKEND.md CHECK constraint
export const PayPeriodSchema = z.enum(['hour', 'week', 'year']);
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
  description: z.string().nullable(),
  photo_url: z.string().url().nullable(),
  status: JobStatusSchema,
  expires_at: z.string(),
  hired_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Job = z.infer<typeof JobSchema>;

// Job creation form schema
// Per 02-mvp-definition.md §1: title, employer_name (from profile), job_type, pay_rate, hours, suburb, description, photo
export const JobCreateSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  job_type: z.enum(JOB_TYPES, {
    errorMap: () => ({ message: 'Please select a job type' }),
  }),
  pay_display: z
    .string()
    .min(1, 'Pay rate is required')
    .max(50, 'Pay display too long')
    .regex(/\$\d+/, 'Pay must start with $ followed by amount'),
  pay_amount: z.number().positive('Pay amount must be positive'),
  pay_period: PayPeriodSchema,
  hours_text: z
    .string()
    .min(5, 'Please describe the hours')
    .max(200, 'Hours description too long'),
  suburb: z.enum(BEACHHEAD_SUBURBS, {
    errorMap: () => ({ message: 'Please select a valid suburb' }),
  }),
  description: z.string().max(2000, 'Description too long').nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
});

export type JobCreateInput = z.infer<typeof JobCreateSchema>;
