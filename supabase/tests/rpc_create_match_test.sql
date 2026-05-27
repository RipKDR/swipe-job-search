-- Test create_match RPC idempotency
-- Verifies double-tap returns same match ID (ARCHITECTURE_AUDIT.md CRITICAL-1 fix)

begin;

-- Setup test data
insert into auth.users (id, email) values 
  ('11111111-1111-1111-1111-111111111111', 'employer@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'candidate@test.com');

insert into profiles (id, email, role, full_name, suburb, onboarding_completed_at)
values
  ('11111111-1111-1111-1111-111111111111', 'employer@test.com', 'employer', 'Test Employer', 'Tullamarine', now()),
  ('22222222-2222-2222-2222-222222222222', 'candidate@test.com', 'candidate', 'Test Candidate', 'Tullamarine', now());

insert into employer_profiles (profile_id, business_name)
values ('11111111-1111-1111-1111-111111111111', 'Test Business');

-- Get default circle
declare default_circle_id uuid;
select id into default_circle_id from circles where is_default = true limit 1;

-- Create test job
insert into jobs (id, employer_id, circle_id, title, job_type, pay_display, pay_amount, pay_period, hours_text, suburb, expires_at)
values (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  default_circle_id,
  'Test Job',
  'casual',
  '$30/hr',
  30.00,
  'hour',
  'Mon-Fri 9am-5pm',
  'Tullamarine',
  now() + interval '30 days'
);

-- Candidate swipes right
set local role authenticated;
set local request.jwt.claims.sub to '22222222-2222-2222-2222-222222222222';

insert into swipes (candidate_id, job_id, direction)
values ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'right');

-- Employer creates match
set local request.jwt.claims.sub to '11111111-1111-1111-1111-111111111111';

select plan(3);

-- First call
declare match_id1 uuid;
select create_match(
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222'
) into match_id1;

select ok(match_id1 is not null, 'First create_match call succeeds');

-- Second call (idempotent)
declare match_id2 uuid;
select create_match(
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222'
) into match_id2;

select is(match_id2, match_id1, 'Second create_match call returns same match ID');

-- Verify only one match row exists
select is(
  (select count(*) from matches where job_id = '33333333-3333-3333-3333-333333333333'),
  1::bigint,
  'Only one match row exists after double create_match'
);

rollback;
