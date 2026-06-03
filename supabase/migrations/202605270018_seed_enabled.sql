-- Force-seed for local dev
-- This runs the seed data with app.settings.seed_enabled forced to true
do $$
declare
  v_default_circle_id uuid;
  v_employer1_id uuid;
  v_employer2_id uuid;
begin
  -- Force enable seed
  perform set_config('app.settings.seed_enabled', 'true', false);

  select id into v_default_circle_id from circles where is_default = true limit 1;
  if v_default_circle_id is null then
    raise exception 'No default circle found. Migration 005 must run first.';
  end if;

  -- Demo employer 1
  select id into v_employer1_id from auth.users where email = 'demo-employer1@example.com';
  if v_employer1_id is null then
    insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, is_sso_user)
    values (gen_random_uuid(), 'demo-employer1@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), false)
    returning id into v_employer1_id;
  end if;

  update profiles set role = 'employer', full_name = 'Melbourne Warehouse Co', suburb = 'Tullamarine', onboarding_completed_at = now()
  where id = v_employer1_id;

  insert into employer_profiles (profile_id, business_name, about_text, verified)
  values (v_employer1_id, 'Melbourne Warehouse Co', 'Leading logistics and warehousing in Northern Melbourne.', true)
  on conflict (profile_id) do nothing;

  -- Demo employer 2
  select id into v_employer2_id from auth.users where email = 'demo-employer2@example.com';
  if v_employer2_id is null then
    insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, is_sso_user)
    values (gen_random_uuid(), 'demo-employer2@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), false)
    returning id into v_employer2_id;
  end if;

  update profiles set role = 'employer', full_name = 'Airport Hospitality Group', suburb = 'Tullamarine', onboarding_completed_at = now()
  where id = v_employer2_id;

  insert into employer_profiles (profile_id, business_name, about_text, verified)
  values (v_employer2_id, 'Airport Hospitality Group', 'Melbourne Airport food & beverage.', true)
  on conflict (profile_id) do nothing;

  if exists (select 1 from jobs limit 1) then
    raise notice 'Jobs already seeded, skipping';
    return;
  end if;

  insert into jobs (employer_id, circle_id, title, job_type, pay_display, pay_amount, pay_period, hours_text, suburb, description, status, expires_at)
  values
    (v_employer1_id, v_default_circle_id, 'Warehouse Picker', 'casual', '$32/hr', 32.00, 'hour', 'Sat-Sun 6am-2pm', 'Tullamarine', 'Weekend shifts in clean, modern warehouse.', 'active', now() + interval '30 days'),
    (v_employer1_id, v_default_circle_id, 'Forklift Driver', 'casual', '$38/hr', 38.00, 'hour', 'Mon-Fri 7am-3pm', 'Tullamarine', 'Forklift licence required.', 'active', now() + interval '30 days'),
    (v_employer1_id, v_default_circle_id, 'Order Packer (Evening)', 'part_time', '$600/week', 600.00, 'week', 'Mon-Fri 4pm-9pm', 'Tullamarine', 'Evening part-time work.', 'active', now() + interval '30 days'),
    (v_employer1_id, v_default_circle_id, 'Warehouse Leading Hand', 'permanent', '$65k/year', 65000.00, 'year', 'Mon-Fri 8am-5pm', 'Tullamarine', 'Supervise team of 8 pickers.', 'active', now() + interval '30 days'),
    (v_employer2_id, v_default_circle_id, 'Barista', 'casual', '$30/hr', 30.00, 'hour', 'Flexible shifts 5am-2pm', 'Tullamarine', 'Busy airport cafe.', 'active', now() + interval '30 days'),
    (v_employer2_id, v_default_circle_id, 'Kitchen Hand', 'casual', '$28/hr', 28.00, 'hour', 'Evenings 2pm-10pm', 'Tullamarine', 'Airport restaurant kitchen.', 'active', now() + interval '30 days'),
    (v_employer2_id, v_default_circle_id, 'Food & Beverage Attendant', 'part_time', '$550/week', 550.00, 'week', 'Weekends 7am-4pm', 'Tullamarine', 'Weekend breakfast/lunch shifts.', 'active', now() + interval '30 days'),
    (v_employer2_id, v_default_circle_id, 'Shift Manager - Food Court', 'permanent', '$58k/year', 58000.00, 'year', 'Rotating roster incl. weekends', 'Tullamarine', 'Lead food court operations.', 'active', now() + interval '30 days');

  raise notice 'Seed complete: 2 demo employers + 8 beachhead jobs';
end $$;
