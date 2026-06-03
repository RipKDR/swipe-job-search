-- RPC integration test: create_match idempotency (ARCHITECTURE_AUDIT CRITICAL-1)
-- Run: psql $DATABASE_URL -f supabase/tests/rpc_create_match_test.sql

begin;

do $$
declare
  v_employer_id uuid := '11111111-1111-1111-1111-111111111111';
  v_candidate_id uuid := '22222222-2222-2222-2222-222222222222';
  v_job_id uuid := '33333333-3333-3333-3333-333333333333';
  v_circle_id uuid;
  v_match_id1 uuid;
  v_match_id2 uuid;
  v_match_count bigint;
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  values
    (v_employer_id, 'employer@test.com', crypt('test', gen_salt('bf')), now(), now(), now()),
    (v_candidate_id, 'candidate@test.com', crypt('test', gen_salt('bf')), now(), now(), now())
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

  insert into swipes (candidate_id, job_id, direction)
  values (v_candidate_id, v_job_id, 'right')
  on conflict (candidate_id, job_id) do update set direction = 'right';

  perform set_config('request.jwt.claim.sub', v_employer_id::text, true);
  perform set_config('role', 'authenticated', true);

  select public.create_match(v_job_id, v_candidate_id) into v_match_id1;

  if v_match_id1 is null then
    raise exception 'FAIL: first create_match returned null';
  end if;

  select public.create_match(v_job_id, v_candidate_id) into v_match_id2;

  if v_match_id2 is distinct from v_match_id1 then
    raise exception 'FAIL: second create_match returned different id (%) vs (%)', v_match_id2, v_match_id1;
  end if;

  select count(*) into v_match_count from matches where job_id = v_job_id;

  if v_match_count <> 1 then
    raise exception 'FAIL: expected 1 match row, got %', v_match_count;
  end if;

  raise notice 'PASS: rpc_create_match_test';
end $$;

rollback;
