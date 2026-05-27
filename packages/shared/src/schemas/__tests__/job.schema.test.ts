/**
 * Job schema validation tests
 */

import { describe, it, expect } from 'vitest'
import { JobSchema } from '../job'

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
      photo_url: null,
      status: 'active',
      expires_at: '2026-06-27T00:00:00Z',
      hired_at: null,
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
      pay_period: 'daily',
      hours_text: 'Mon-Fri',
      suburb: 'Tullamarine',
      description: null,
      photo_url: null,
      status: 'active',
      expires_at: '2026-06-27T00:00:00Z',
      hired_at: null,
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
      pay_amount: -30.0,
      pay_period: 'hour',
      hours_text: 'Mon-Fri',
      suburb: 'Tullamarine',
      description: null,
      photo_url: null,
      status: 'active',
      expires_at: '2026-06-27T00:00:00Z',
      hired_at: null,
      created_at: '2026-05-27T00:00:00Z',
      updated_at: '2026-05-27T00:00:00Z',
    }

    expect(() => JobSchema.parse(invalidJob)).toThrow()
  })

  it('accepts nullable fields as null', () => {
    const jobWithNulls = {
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
      description: null,
      photo_url: null,
      status: 'active',
      expires_at: '2026-06-27T00:00:00Z',
      hired_at: null,
      created_at: '2026-05-27T00:00:00Z',
      updated_at: '2026-05-27T00:00:00Z',
    }

    expect(() => JobSchema.parse(jobWithNulls)).not.toThrow()
  })
})
