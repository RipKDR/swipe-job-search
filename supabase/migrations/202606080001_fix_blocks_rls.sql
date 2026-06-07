-- Fix: blocks-based filtering in swipes_select_employer RLS policy
--
-- Problem: the original NOT EXISTS subquery on blocks ran under the employer's
-- JWT, which could only see blocks the employer *initiated*. A candidate-initiated
-- block (blocker=candidate, blocked=employer) was invisible, so the filter never
-- excluded the swipe.
--
-- Fix: replace the inline NOT EXISTS with a SECURITY DEFINER helper that reads
-- blocks as the function owner (bypassing blocks RLS), so either party's block
-- correctly hides the swipe.

create or replace function is_blocked_pair(user1_id uuid, user2_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from blocks
    where (blocker_id = user1_id and blocked_id = user2_id)
       or (blocker_id = user2_id and blocked_id = user1_id)
  );
$$;

drop policy if exists "swipes_select_employer" on swipes;

create policy "swipes_select_employer" on swipes for select using (
  exists (
    select 1 from jobs j
    where j.id = swipes.job_id
      and j.employer_id = auth.uid()
  )
  and not is_blocked_pair(auth.uid(), swipes.candidate_id)
);
