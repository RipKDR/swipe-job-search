-- Account deletion (App Store 5.1.1(v) / GDPR right-to-erasure)
--
-- purge_user_data deletes every row that references the user's profile,
-- in FK-dependency order, then the profile itself. The delete-account
-- Edge Function calls this with the service role, removes the user's
-- storage objects, and finally deletes the auth.users row (which would
-- otherwise be blocked by the non-cascading FKs handled here).
--
-- Service-role only: never expose to authenticated/anon.

create or replace function public.purge_user_data(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Feedback rows tied to the user or to matches/jobs they own
  delete from employer_feedback
  where employer_id = p_user_id
     or application_id in (
       select id from matches
       where candidate_id = p_user_id or employer_id = p_user_id
     );

  delete from candidate_feedback
  where candidate_id = p_user_id
     or job_id in (select id from jobs where employer_id = p_user_id);

  -- Anti-ghosting records
  delete from employer_ratings
  where candidate_id = p_user_id
     or job_id in (select id from jobs where employer_id = p_user_id);

  delete from ghosting_reports
  where candidate_id = p_user_id
     or job_id in (select id from jobs where employer_id = p_user_id);

  -- Salary + compliance records
  delete from salary_reports
  where reported_by = p_user_id
     or job_id in (select id from jobs where employer_id = p_user_id);

  delete from compliance_report_rows where candidate_id = p_user_id;

  delete from compliance_reports
  where candidate_id = p_user_id or provider_id = p_user_id;

  -- Bulk swipe consent log
  delete from bulk_swipe_log
  where provider_id = p_user_id
     or candidate_id = p_user_id
     or job_id in (select id from jobs where employer_id = p_user_id);

  -- Trust & safety reports: drop those by/about the user, detach the rest
  delete from reports where reporter_id = p_user_id or reported_id = p_user_id;

  update reports set match_id = null
  where match_id in (
    select id from matches
    where candidate_id = p_user_id or employer_id = p_user_id
  );

  update reports set job_id = null
  where job_id in (select id from jobs where employer_id = p_user_id);

  -- Conversations: messages the user sent, then matches they belong to
  -- (match deletion cascades remaining messages -> message_attachments)
  delete from messages where sender_id = p_user_id;

  delete from matches
  where candidate_id = p_user_id
     or employer_id = p_user_id
     or initiated_by = p_user_id
     or hire_initiated_by = p_user_id;

  -- Swipes by the user (swipes on their jobs cascade with the job)
  delete from swipes where candidate_id = p_user_id;

  -- Jobs the user posted (cascades swipes on those jobs)
  delete from jobs where employer_id = p_user_id;

  -- Detach referrals pointing at the user
  update profiles set referred_by = null where referred_by = p_user_id;

  -- Profile row last; cascades employer_profiles, circles, device_tokens,
  -- notification_preferences, blocks, streaks, bookmarks, share_events,
  -- referral_rewards.
  delete from profiles where id = p_user_id;
end;
$$;

revoke all on function public.purge_user_data(uuid) from public;
revoke all on function public.purge_user_data(uuid) from anon;
revoke all on function public.purge_user_data(uuid) from authenticated;
grant execute on function public.purge_user_data(uuid) to service_role;
