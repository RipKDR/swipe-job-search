import { z } from 'zod'
import { BEACHHEAD_SUBURBS } from '../constants/suburbs'
import { WORK_RIGHTS } from '../constants/work-rights'

const BEACHHEAD_SUBURB_VALUES = [...BEACHHEAD_SUBURBS] as [
  (typeof BEACHHEAD_SUBURBS)[number],
  ...(typeof BEACHHEAD_SUBURBS)[number][],
]

const WORK_RIGHTS_VALUES = [...WORK_RIGHTS] as [
  (typeof WORK_RIGHTS)[number],
  ...(typeof WORK_RIGHTS)[number][],
]

export const CandidateOnboardingSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100),
  suburb: z.enum(BEACHHEAD_SUBURB_VALUES, {
    error: 'Please select a suburb',
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
  work_rights: z.enum(WORK_RIGHTS_VALUES, {
    error: 'Please select your work rights',
  }),
  avatar_url: z.string().url().nullish(),
})

export type CandidateOnboarding = z.infer<typeof CandidateOnboardingSchema>

export const EmployerOnboardingSchema = z.object({
  business_name: z.string().min(1, 'Business name is required').max(100),
  suburb: z.enum(BEACHHEAD_SUBURB_VALUES, {
    error: 'Please select a suburb',
  }),
  contact_name: z.string().min(1, 'Contact name is required').max(100),
  about_text: z.string().max(500, 'About text too long (max 500 characters)').optional(),
  avatar_url: z.string().url().nullish(),
})

export type EmployerOnboarding = z.infer<typeof EmployerOnboardingSchema>
