/**
 * Job schema for validation
 */

import { z } from 'zod'

export const JobSchema = z.object({
  id: z.string().uuid(),
  employer_id: z.string().uuid(),
  circle_id: z.string().uuid(),
  title: z.string().min(1).max(100),
  job_type: z.enum(['casual', 'part_time', 'permanent']),
  pay_display: z.string(),
  pay_amount: z.number().positive(),
  pay_period: z.enum(['hour', 'week', 'year']),
  hours_text: z.string(),
  suburb: z.string(),
  description: z.string().optional(),
  photo_url: z.string().url().optional(),
  status: z.enum(['active', 'hired', 'expired', 'paused']),
  expires_at: z.string().datetime(),
  hired_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type Job = z.infer<typeof JobSchema>
