-- Rate limit integration tests (MVP: 10 swipes/min, 5 matches/day)
-- Run: psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/tests/rate_limits_test.sql

begin;

do $$
declare
  v_employer_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_candidate_id uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_target_job_id uuid;
  v_circle_id uuid;
  v_temp_job_id uuid;
  v_i int;
  v_err text;
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  values
    (v_employer_id, 'rate-employer@test.com', crypt('test', gen_salt('bf')), now(), now(), now()),
    (v_candidate_id, 'rate-candidate@test.com', crypt('test', gen_salt('bf')), now(), now(), now())
  on conflict (id) do nothing;

  update profiles set role = 'employer', full_name = 'Rate Employer', suburb = 'Tullamarine', onboarding_completed_at = now()
  where id = v_employer_id;
  update profiles set role = 'candidate', full_name = 'Rate Candidate', suburb = 'Tullamarine', onboarding_completed_at = now()
  where id = v_candidate_id;

  insert into employer_profiles (profile_id, business_name)
  values (v_employer_id, 'Rate Biz')
  on conflict (profile_id) do nothing;

  select id into v_circle_id from circles where is_default = true limit 1;

  insert into jobs (employer_id, circle_id, title, job_type, pay_display, pay_amount, pay_period, hours_text, suburb, description, status, expires_at)
  values (v_employer_id, v_circle_id, 'Rate Target Job', 'casual', '$30/hr', 30, 'hour', 'Flexible', 'Tullamarine', 'Target', 'active', now() + interval '30 days')
  returning id into v_target_job_id;

  perform set_config('request.jwt.claim.sub', v_candidate_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  for v_i in 1..10 loop
    insert into jobs (employer_id, circle_id, title, job_type, pay_display, pay_amount, pay_period, hours_text, suburb, description, status, expires_at)
    values (v_employer_id, v_circle_id, 'Rate Job ' || v_i, 'casual', '$30/hr', 30, 'hour', 'Flexible', 'Tullamarine', 'Test', 'active', now() + interval '30 days')
    returning id into v_temp_job_id;

    insert into swipes (candidate_id, job_id, direction)
    values (v_candidate_id, v_temp_job_id, 'left');
  end loop;

  begin
    insert into swipes (candidate_id, job_id, direction)
    values (v_candidate_id, v_target_job_id, 'right');
    raise exception 'Expected swipe rate limit on 11th insert';
  exception
    when others then
      v_err := sqlerrm;
      if v_err not like '%RATE_LIMIT_EXCEEDED%' then
        raise;
      end if;
  end;

  raise notice 'PASS: swipe rate limit enforced at 10/min';
end $$;

rollback;
