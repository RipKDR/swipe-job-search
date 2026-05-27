import { z } from 'zod';

// Phase 1 placeholder — real schemas (profile, job, swipe, match) in U4
export const PlaceholderSchema = z.object({
  id: z.string(),
  createdAt: z.date()
});

export type Placeholder = z.infer<typeof PlaceholderSchema>;