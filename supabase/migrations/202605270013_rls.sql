-- RLS policies for all tables

-- Profiles: own + public fields for matched/interested users
create policy "profiles_select_own" on profiles for select using (id = auth.uid());
create policy "profiles_update_own" on profiles for update using (id = auth.uid());

-- Employer profiles: public read, own write
create policy "employer_profiles_select_all" on employer_profiles for select using (true);
create policy "employer_profiles_insert_own" on employer_profiles for insert 
  with check (profile_id = auth.uid());
create policy "employer_profiles_update_own" on employer_profiles for update 
  using (profile_id = auth.uid());

-- Circles: members can read
create policy "circles_select_members" on circles for select using (
  exists (
    select 1 from circle_members
    where circle_id = circles.id and profile_id = auth.uid()
  )
);

-- Circle members: own membership
create policy "circle_members_select_own" on circle_members for select
  using (profile_id = auth.uid());

-- Jobs: candidates read active in their circles; employers all own
create policy "jobs_select_candidates" on jobs for select using (
  status = 'active'
  and circle_id in (
    select circle_id from circle_members where profile_id = auth.uid()
  )
);

create policy "jobs_all_employer" on jobs for all using (employer_id = auth.uid())
  with check (employer_id = auth.uid());

-- Swipes: candidate own; employer read interested on their jobs (ARCHITECTURE_AUDIT.md HIGH-4 fix)
create policy "swipes_insert_candidate" on swipes for insert
  with check (candidate_id = auth.uid());

create policy "swipes_update_candidate" on swipes for update
  using (candidate_id = auth.uid());

create policy "swipes_select_own" on swipes for select
  using (candidate_id = auth.uid());

create policy "swipes_select_employer" on swipes for select using (
  exists (
    select 1 from jobs j
    where j.id = swipes.job_id
      and j.employer_id = auth.uid()
  )
  and not exists (
    select 1
    from blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = swipes.candidate_id)
       or (b.blocker_id = swipes.candidate_id and b.blocked_id = auth.uid())
  )
);

-- Matches: match participants
create policy "matches_select" on matches for select using (
  candidate_id = auth.uid() or employer_id = auth.uid()
);

create policy "matches_update" on matches for update using (
  candidate_id = auth.uid() or employer_id = auth.uid()
);

-- Messages: match participants
create policy "messages_all" on messages for all using (
  exists (
    select 1 from matches m
    where m.id = match_id
      and (m.candidate_id = auth.uid() or m.employer_id = auth.uid())
  )
) with check (
  sender_id = auth.uid()
  and exists (
    select 1 from matches m
    where m.id = match_id
      and (m.candidate_id = auth.uid() or m.employer_id = auth.uid())
      and m.status in ('chatting', 'hire_pending')
  )
);

-- Device tokens: own
create policy "device_tokens_all_own" on device_tokens for all 
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Notification preferences: own
create policy "notification_preferences_select_own" on notification_preferences for select
  using (profile_id = auth.uid());
create policy "notification_preferences_update_own" on notification_preferences for update
  using (profile_id = auth.uid());

-- Reports: own submitted
create policy "reports_select_own" on reports for select
  using (reporter_id = auth.uid());
create policy "reports_insert_own" on reports for insert
  with check (reporter_id = auth.uid());

-- Blocks: own
create policy "blocks_select_own" on blocks for select
  using (blocker_id = auth.uid());
create policy "blocks_insert_own" on blocks for insert
  with check (blocker_id = auth.uid());
create policy "blocks_delete_own" on blocks for delete
  using (blocker_id = auth.uid());

-- Realtime: required for chat (messages), inbox (matches), employer interest (swipes)
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table swipes;
