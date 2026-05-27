/**
 * Profile schemas for validation
 * Matches profiles table from supabase/migrations/202605270003_profiles.sql
 */

import { z } from 'zod'
import { BEACHHEAD_SUBURBS } from '../constants/suburbs'
import { WORK_RIGHTS } from '../constants/work-rights'

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['candidate', 'employer']),
  full_name: z.string().nullable(),
  email: z.string().email(),
  phone: z.string().nullable(),
  suburb: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
  experience_text: z.string().nullable(),
  skills: z.array(z.string()).default([]),
  availability_text: z.string().nullable(),
  work_rights: z.string().nullable(),
  onboarding_completed_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type Profile = z.infer<typeof ProfileSchema>

export const CandidateOnboardingSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100),
  suburb: z.enum(BEACHHEAD_SUBURBS, {
    errorMap: () => ({ message: 'Please select a suburb' }),
  }),
  experience_text: z
    .string()
    .min(10, 'Please describe your experience (at least 10 characters)')
    .max(500, 'Experience description too long (max 500 characters)'),
  skills: z
    .array(z.string().min(1))
    .min(1, 'Add at least one skill')
    .max(5, 'Maximum 5 skills allowed'),
  availability_text: z
    .string()
    .min(5, 'Please describe your availability')
    .max(200, 'Availability text too long (max 200 characters)'),
  work_rights: z.enum(WORK_RIGHTS, {
    errorMap: () => ({ message: 'Please select your work rights' }),
  }),
  avatar_url: z.string().url().nullish(),
})

export type CandidateOnboarding = z.infer<typeof CandidateOnboardingSchema>

export const EmployerOnboardingSchema = z.object({
  business_name: z.string().min(1, 'Business name is required').max(100),
  suburb: z.enum(BEACHHEAD_SUBURBS, {
    errorMap: () => ({ message: 'Please select a suburb' }),
  }),
  contact_name: z.string().min(1, 'Contact name is required').max(100),
  about_text: z.string().max(500, 'About text too long (max 500 characters)').optional(),
  avatar_url: z.string().url().nullish(),
})

export type EmployerOnboarding = z.infer<typeof EmployerOnboardingSchema>
