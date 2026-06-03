-- RLS integration test: employer can read swipes on own jobs (ARCHITECTURE_AUDIT HIGH-4)
-- Run: psql $DATABASE_URL -f supabase/tests/rls_swipes_test.sql
-- Requires: migrations applied; uses service-role style setup then JWT simulation

begin;

do $$
declare
  v_employer_id uuid := '11111111-1111-1111-1111-111111111111';
  v_candidate_id uuid := '22222222-2222-2222-2222-222222222222';
  v_other_employer_id uuid := '44444444-4444-4444-4444-444444444444';
  v_job_id uuid := '33333333-3333-3333-3333-333333333333';
  v_circle_id uuid;
  v_count int;
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  values
    (v_employer_id, 'employer@test.com', crypt('test', gen_salt('bf')), now(), now(), now()),
    (v_candidate_id, 'candidate@test.com', crypt('test', gen_salt('bf')), now(), now(), now()),
    (v_other_employer_id, 'other@test.com', crypt('test', gen_salt('bf')), now(), now(), now())
  on conflict (id) do nothing;

  update profiles set
    role = 'employer',
    full_name = 'Test Employer',
    suburb = 'Tullamarine',
    onboarding_completed_at = now()
  where id = v_employer_id;

  update profiles set
    role = 'candidate',
    full_name = 'Test Candidate',
    suburb = 'Tullamarine',
    onboarding_completed_at = now()
  where id = v_candidate_id;

  update profiles set
    role = 'employer',
    full_name = 'Other Employer',
    suburb = 'Tullamarine',
    onboarding_completed_at = now()
  where id = v_other_employer_id;

  insert into employer_profiles (profile_id, business_name)
  values (v_employer_id, 'Test Business')
  on conflict (profile_id) do nothing;

  select id into v_circle_id from circles where is_default = true limit 1;

  insert into jobs (id, employer_id, circle_id, title, job_type, pay_display, pay_amount, pay_period, hours_text, suburb, expires_at)
  values (
    v_job_id,
    v_employer_id,
    v_circle_id,
    'Test Job',
    'casual',
    '$30/hr',
    30.00,
    'hour',
    'Mon-Fri 9am-5pm',
    'Tullamarine',
    now() + interval '30 days'
  )
  on conflict (id) do nothing;

  -- Candidate inserts swipe (bypass RLS as postgres superuser in local test)
  insert into swipes (candidate_id, job_id, direction)
  values (v_candidate_id, v_job_id, 'right')
  on conflict (candidate_id, job_id) do update set direction = 'right';

  -- Simulate employer JWT and verify RLS allows read
  perform set_config('request.jwt.claim.sub', v_employer_id::text, true);
  perform set_config('role', 'authenticated', true);

  select count(*) into v_count
  from swipes
  where job_id = v_job_id and direction = 'right';

  if v_count < 1 then
    raise exception 'FAIL: employer cannot read swipes on own job';
  end if;

  -- Other employer must not see swipes
  perform set_config('request.jwt.claim.sub', v_other_employer_id::text, true);

  select count(*) into v_count
  from swipes
  where job_id = v_job_id;

  if v_count > 0 then
    raise exception 'FAIL: other employer can read swipes they do not own';
  end if;

  raise notice 'PASS: rls_swipes_test';
end $$;

rollback;
