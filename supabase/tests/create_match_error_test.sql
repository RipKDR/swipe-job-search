-- Integration test: create_match for non-interested (no right swipe) raises CANDIDATE_NOT_INTERESTED (plan 2026-05-27-001 U2 test scenarios + ARCHITECTURE_AUDIT)
-- Run: psql $DATABASE_URL -f supabase/tests/create_match_error_test.sql
-- Requires: migrations applied (create_match in 008)

begin;

do $$
declare
  v_employer_id uuid := '11111111-1111-1111-1111-111111111111';
  v_candidate_id uuid := '22222222-2222-2222-2222-222222222222';
  v_job_id uuid := '33333333-3333-3333-3333-333333333333';
  v_circle_id uuid;
  v_match_id uuid;
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

  -- NOTE: intentionally NO right swipe for this candidate/job (to trigger the error path)
  -- (a left or no swipe should cause CANDIDATE_NOT_INTERESTED)

  perform set_config('request.jwt.claim.sub', v_employer_id::text, true);
  perform set_config('role', 'authenticated', true);

  -- GREEN: correct error expectation after red phase edit (TDD cycle complete for this test)
  begin
    select public.create_match(v_job_id, v_candidate_id) into v_match_id;
    raise exception 'FAIL: create_match succeeded without right swipe (expected error, got match %)', v_match_id;
  exception when others then
    if position('CANDIDATE_NOT_INTERESTED' in sqlerrm) > 0 then
      raise notice 'PASS: create_match_error_test';
    else
      raise exception 'FAIL: expected CANDIDATE_NOT_INTERESTED but got %', sqlerrm;
    end if;
  end;
end $$;

rollback;