/**
 * Swipe schema for validation
 * Matches swipes table from supabase/migrations/202605270007_swipes.sql
 */

import { z } from 'zod'

export const SwipeSchema = z.object({
  id: z.string().uuid(),
  candidate_id: z.string().uuid(),
  job_id: z.string().uuid(),
  direction: z.enum(['right', 'left', 'applied']),
  created_at: z.string().datetime(),
})

export type Swipe = z.infer<typeof SwipeSchema>

// Upsert swipe payload
export const UpsertSwipeSchema = z.object({
  candidate_id: z.string().uuid(),
  job_id: z.string().uuid(),
  direction: z.enum(['right', 'left', 'applied']),
})

export type UpsertSwipe = z.infer<typeof UpsertSwipeSchema>
