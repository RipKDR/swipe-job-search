-- Integration test: swipe right enqueues interest_received with unique idempotency_key (plan 2026-05-27-001 U2 test scenarios)
-- Run: psql $DATABASE_URL -f supabase/tests/notification_enqueue_test.sql
-- Requires: migrations applied (queue + enqueue trigger from 007/011)

begin;

do $$
declare
  v_employer_id uuid := '11111111-1111-1111-1111-111111111111';
  v_candidate_id uuid := '22222222-2222-2222-2222-222222222222';
  v_job_id uuid := '33333333-3333-3333-3333-333333333333';
  v_circle_id uuid;
  v_swipe_id uuid;
  v_count int;
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

  -- Candidate swipes right -> trigger should enqueue with idempotency_key = 'interest:' || swipe.id
  insert into swipes (candidate_id, job_id, direction)
  values (v_candidate_id, v_job_id, 'right')
  on conflict (candidate_id, job_id) do update set direction = 'right'
  returning id into v_swipe_id;

  -- Verify enqueue happened (no RLS on queue; runs as postgres in test)
  select count(*) into v_count
  from notification_queue
  where idempotency_key = 'interest:' || v_swipe_id::text
    and type = 'interest_received';

  -- GREEN: correct assertion after red phase edit (TDD cycle complete for this test)
  if v_count < 1 then
    raise exception 'FAIL: swipe right did not enqueue interest_received with expected idempotency key';
  end if;

  raise notice 'PASS: notification_enqueue_test';
end $$;

rollback;