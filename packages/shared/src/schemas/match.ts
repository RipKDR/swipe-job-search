/**
 * Match schema for validation
 * Matches matches table from supabase/migrations/202605270008_matches.sql
 */

import { z } from 'zod'

export const MatchSchema = z.object({
  id: z.string().uuid(),
  job_id: z.string().uuid(),
  candidate_id: z.string().uuid(),
  employer_id: z.string().uuid(),
  status: z.enum(['chatting', 'hire_pending', 'hired', 'unmatched', 'archived']),
  candidate_hired_at: z.string().datetime().nullable(),
  employer_hired_at: z.string().datetime().nullable(),
  unmatched_at: z.string().datetime().nullable(),
  unmatched_by: z.string().uuid().nullable(),
  archived_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type Match = z.infer<typeof MatchSchema>
