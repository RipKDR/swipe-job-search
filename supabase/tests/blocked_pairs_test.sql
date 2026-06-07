-- Integration test: blocked pairs are excluded from interested list and cannot be matched
-- Run: psql $DATABASE_URL -f supabase/tests/blocked_pairs_test.sql
-- Requires: migrations applied (008 create_match, 012 blocks, 013 swipes RLS)

begin;

do $$
declare
  v_employer_id uuid := '55555555-5555-5555-5555-555555555555';
  v_candidate_id uuid := '66666666-6666-6666-6666-666666666666';
  v_job_id uuid := '77777777-7777-7777-7777-777777777777';
  v_circle_id uuid;
  v_visible_count int;
  v_match_id uuid;
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  values
    (v_employer_id, 'blocked-employer@test.com', crypt('test', gen_salt('bf')), now(), now(), now()),
    (v_candidate_id, 'blocked-candidate@test.com', crypt('test', gen_salt('bf')), now(), now(), now())
  on conflict (id) do nothing;

  update profiles set
    role = 'employer',
    full_name = 'Blocked Employer',
    suburb = 'Tullamarine',
    onboarding_completed_at = now()
  where id = v_employer_id;

  update profiles set
    role = 'candidate',
    full_name = 'Blocked Candidate',
    suburb = 'Tullamarine',
    onboarding_completed_at = now()
  where id = v_candidate_id;

  insert into employer_profiles (profile_id, business_name)
  values (v_employer_id, 'Blocked Business')
  on conflict (profile_id) do nothing;

  select id into v_circle_id from circles where is_default = true limit 1;

  insert into jobs (id, employer_id, circle_id, title, job_type, pay_display, pay_amount, pay_period, hours_text, suburb, expires_at)
  values (
    v_job_id,
    v_employer_id,
    v_circle_id,
    'Blocked Pair Job',
    'casual',
    '$31/hr',
    31.00,
    'hour',
    'Mon-Fri 9am-5pm',
    'Tullamarine',
    now() + interval '30 days'
  )
  on conflict (id) do nothing;

  insert into swipes (candidate_id, job_id, direction)
  values (v_candidate_id, v_job_id, 'right')
  on conflict (candidate_id, job_id) do update set direction = 'right';

  perform set_config('request.jwt.claim.sub', v_employer_id::text, true);
  perform set_config('role', 'authenticated', true);

  select count(*) into v_visible_count
  from swipes
  where job_id = v_job_id and direction = 'right';

  if v_visible_count <> 1 then
    raise exception 'FAIL: expected visible interested swipe before block, got %', v_visible_count;
  end if;

  -- Block must be inserted as the blocker (candidate), so switch JWT context
  perform set_config('request.jwt.claim.sub', v_candidate_id::text, true);

  insert into blocks (blocker_id, blocked_id)
  values (v_candidate_id, v_employer_id)
  on conflict (blocker_id, blocked_id) do nothing;

  -- Switch back to employer to verify the blocked candidate is no longer visible
  perform set_config('request.jwt.claim.sub', v_employer_id::text, true);

  select count(*) into v_visible_count
  from swipes
  where job_id = v_job_id and direction = 'right';

  if v_visible_count <> 0 then
    raise exception 'FAIL: blocked candidate still visible in interested list (count %)', v_visible_count;
  end if;

  begin
    select public.create_match(v_job_id, v_candidate_id) into v_match_id;
    raise exception 'FAIL: create_match succeeded for blocked pair (match %)', v_match_id;
  exception when others then
    if position('BLOCKED_PAIR' in sqlerrm) = 0 then
      raise exception 'FAIL: expected BLOCKED_PAIR but got %', sqlerrm;
    end if;
  end;

  raise notice 'PASS: blocked_pairs_test';
end $$;

rollback;
