/**
 * Job schema validation tests
 * 
 * Tests that job data conforms to expected schema
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Job schema from packages/shared/src/schemas/job.schema.ts
const JobSchema = z.object({
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

describe('Job Schema', () => {
  it('validates a valid job object', () => {
    const validJob = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      employer_id: '550e8400-e29b-41d4-a716-446655440001',
      circle_id: '550e8400-e29b-41d4-a716-446655440002',
      title: 'Warehouse Picker',
      job_type: 'casual',
      pay_display: '$32/hr',
      pay_amount: 32.0,
      pay_period: 'hour',
      hours_text: 'Sat-Sun 6am-2pm',
      suburb: 'Tullamarine',
      description: 'Weekend shifts in warehouse',
      status: 'active',
      expires_at: '2026-06-27T00:00:00Z',
      created_at: '2026-05-27T00:00:00Z',
      updated_at: '2026-05-27T00:00:00Z',
    }

    expect(() => JobSchema.parse(validJob)).not.toThrow()
  })

  it('rejects job with invalid pay_period', () => {
    const invalidJob = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      employer_id: '550e8400-e29b-41d4-a716-446655440001',
      circle_id: '550e8400-e29b-41d4-a716-446655440002',
      title: 'Test Job',
      job_type: 'casual',
      pay_display: '$30/hr',
      pay_amount: 30.0,
      pay_period: 'daily', // Invalid
      hours_text: 'Mon-Fri',
      suburb: 'Tullamarine',
      status: 'active',
      expires_at: '2026-06-27T00:00:00Z',
      created_at: '2026-05-27T00:00:00Z',
      updated_at: '2026-05-27T00:00:00Z',
    }

    expect(() => JobSchema.parse(invalidJob)).toThrow()
  })

  it('rejects job with negative pay_amount', () => {
    const invalidJob = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      employer_id: '550e8400-e29b-41d4-a716-446655440001',
      circle_id: '550e8400-e29b-41d4-a716-446655440002',
      title: 'Test Job',
      job_type: 'casual',
      pay_display: '$-30/hr',
      pay_amount: -30.0, // Invalid
      pay_period: 'hour',
      hours_text: 'Mon-Fri',
      suburb: 'Tullamarine',
      status: 'active',
      expires_at: '2026-06-27T00:00:00Z',
      created_at: '2026-05-27T00:00:00Z',
      updated_at: '2026-05-27T00:00:00Z',
    }

    expect(() => JobSchema.parse(invalidJob)).toThrow()
  })

  it('rejects job with empty title', () => {
    const invalidJob = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      employer_id: '550e8400-e29b-41d4-a716-446655440001',
      circle_id: '550e8400-e29b-41d4-a716-446655440002',
      title: '', // Invalid
      job_type: 'casual',
      pay_display: '$30/hr',
      pay_amount: 30.0,
      pay_period: 'hour',
      hours_text: 'Mon-Fri',
      suburb: 'Tullamarine',
      status: 'active',
      expires_at: '2026-06-27T00:00:00Z',
      created_at: '2026-05-27T00:00:00Z',
      updated_at: '2026-05-27T00:00:00Z',
    }

    expect(() => JobSchema.parse(invalidJob)).toThrow()
  })

  it('accepts optional fields as undefined', () => {
    const jobWithoutOptionals = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      employer_id: '550e8400-e29b-41d4-a716-446655440001',
      circle_id: '550e8400-e29b-41d4-a716-446655440002',
      title: 'Test Job',
      job_type: 'casual',
      pay_display: '$30/hr',
      pay_amount: 30.0,
      pay_period: 'hour',
      hours_text: 'Mon-Fri',
      suburb: 'Tullamarine',
      status: 'active',
      expires_at: '2026-06-27T00:00:00Z',
      created_at: '2026-05-27T00:00:00Z',
      updated_at: '2026-05-27T00:00:00Z',
      // description, photo_url, hired_at omitted
    }

    expect(() => JobSchema.parse(jobWithoutOptionals)).not.toThrow()
  })
})
