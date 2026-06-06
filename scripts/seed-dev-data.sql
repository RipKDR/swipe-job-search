-- =========================================================================
-- Hi-Hired: Development Seed Data
-- 
-- Creates demo employer accounts, jobs, and a demo candidate with swipes.
-- Run in Supabase SQL Editor (Dashboard → SQL Editor).
-- Safe to re-run — uses ON CONFLICT / DO NOTHING.
-- =========================================================================

-- 1. Ensure default circle exists
insert into circles (id, name, suburb_anchor, is_default)
values (gen_random_uuid(), 'Northern Melbourne', 'Tullamarine', true)
on conflict do nothing;

with default_circle as (
  select id from circles where is_default = true limit 1
)
select id into v_circle_id from default_circle;

-- 2. Create demo employers (via auth.users + public.profiles + employer_profiles)
-- Uses a loop to handle the auth.users → profiles trigger chain.

do $$
declare
  v_circle_id uuid;
  v_emp1_id uuid;
  v_emp2_id uuid;
  v_emp3_id uuid;
  v_emp4_id uuid;
  v_candidate_id uuid;
begin
  -- Get the default circle
  select id into v_circle_id from circles where is_default = true limit 1;

  -- ====================================================================
  -- Demo Employer 1: Market Lane Espresso (Fitzroy)
  -- ====================================================================
  select id into v_emp1_id from auth.users where email = 'employer.marketlane@hi-hired.demo';
  if v_emp1_id is null then
    insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user)
    values (gen_random_uuid(), 'employer.marketlane@hi-hired.demo', crypt('hireme123', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', false)
    returning id into v_emp1_id;
  end if;
  update profiles set role = 'employer', full_name = 'Market Lane Espresso', suburb = 'Fitzroy', onboarding_completed_at = now() where id = v_emp1_id;
  insert into employer_profiles (profile_id, business_name, about_text, verified)
  values (v_emp1_id, 'Market Lane Espresso', 'Fitzroy''s favourite specialty coffee spot. We roast on-site and serve the neighbourhood.', true)
  on conflict (profile_id) do nothing;

  -- ====================================================================
  -- Demo Employer 2: Neighbourhood Pasta (Carlton)
  -- ====================================================================
  select id into v_emp2_id from auth.users where email = 'employer.pasta@hi-hired.demo';
  if v_emp2_id is null then
    insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user)
    values (gen_random_uuid(), 'employer.pasta@hi-hired.demo', crypt('hireme123', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', false)
    returning id into v_emp2_id;
  end if;
  update profiles set role = 'employer', full_name = 'Neighbourhood Pasta', suburb = 'Carlton', onboarding_completed_at = now() where id = v_emp2_id;
  insert into employer_profiles (profile_id, business_name, about_text, verified)
  values (v_emp2_id, 'Neighbourhood Pasta', 'Carlton Italian gem on Lygon Street. Hand-made pasta, busy dinner service, great tips.', true)
  on conflict (profile_id) do nothing;

  -- ====================================================================
  -- Demo Employer 3: Northside Fulfilment (Brunswick East)
  -- ====================================================================
  select id into v_emp3_id from auth.users where email = 'employer.northside@hi-hired.demo';
  if v_emp3_id is null then
    insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user)
    values (gen_random_uuid(), 'employer.northside@hi-hired.demo', crypt('hireme123', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', false)
    returning id into v_emp3_id;
  end if;
  update profiles set role = 'employer', full_name = 'Northside Fulfilment', suburb = 'Brunswick East', onboarding_completed_at = now() where id = v_emp3_id;
  insert into employer_profiles (profile_id, business_name, about_text, verified)
  values (v_emp3_id, 'Northside Fulfilment', 'Fast-growing e-commerce fulfilment centre in Brunswick East. Morning shifts, great crew.', true)
  on conflict (profile_id) do nothing;

  -- ====================================================================
  -- Demo Employer 4: Little Lane Cafe (Tullamarine)
  -- ====================================================================
  select id into v_emp4_id from auth.users where email = 'employer.littlelane@hi-hired.demo';
  if v_emp4_id is null then
    insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user)
    values (gen_random_uuid(), 'employer.littlelane@hi-hired.demo', crypt('hireme123', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', false)
    returning id into v_emp4_id;
  end if;
  update profiles set role = 'employer', full_name = 'Little Lane Cafe', suburb = 'Tullamarine', onboarding_completed_at = now() where id = v_emp4_id;
  insert into employer_profiles (profile_id, business_name, about_text, verified)
  values (v_emp4_id, 'Little Lane Cafe', 'Busy airport-adjacent cafe. Early starts, coffee runs, customer service — fast-paced and fun.', true)
  on conflict (profile_id) do nothing;

  -- ====================================================================
  -- Jobs (skip if already seeded)
  -- ====================================================================
  if exists (select 1 from jobs where employer_id = v_emp1_id limit 1) then
    raise notice 'Jobs already seeded, skipping';
    return;
  end if;

  -- Market Lane Espresso (Fitzroy) — 3 jobs
  insert into jobs (employer_id, circle_id, title, job_type, pay_display, pay_amount, pay_period, hours_text, suburb, description, status, expires_at)
  values
    (v_emp1_id, v_circle_id, 'Front Counter + Coffee Runner', 'casual', '$32/hr', 32.00, 'hour', 'Tomorrow · 7am-2pm', 'Fitzroy', 'Busy breakfast rush support. POS, customer runs, and keeping tables clear. Weekend availability a bonus.', 'active', now() + interval '30 days'),
    (v_emp1_id, v_circle_id, 'Weekend Barista', 'casual', '$34/hr', 34.00, 'hour', 'Sat-Sun 6am-1pm', 'Fitzroy', 'Experienced barista for weekend morning shifts. Must love great coffee and fast service. La Marzocco experience preferred.', 'active', now() + interval '30 days'),
    (v_emp1_id, v_circle_id, 'All-rounder (Evening)', 'part_time', '$550/week', 550.00, 'week', 'Tue-Sat 3pm-8pm', 'Fitzroy', 'Afternoon prep, dish support, and closing duties. Perfect for hospitality students.', 'active', now() + interval '30 days');

  -- Neighbourhood Pasta (Carlton) — 3 jobs
  insert into jobs (employer_id, circle_id, title, job_type, pay_display, pay_amount, pay_period, hours_text, suburb, description, status, expires_at)
  values
    (v_emp2_id, v_circle_id, 'Pasta Bar Floor Support', 'casual', '$33/hr', 33.00, 'hour', 'Friday · 5pm-11pm', 'Carlton', 'Fast front room service, water runs, table resets, and close support near Lygon Street.', 'active', now() + interval '30 days'),
    (v_emp2_id, v_circle_id, 'Kitchen Hand / Prep Cook', 'casual', '$30/hr', 30.00, 'hour', 'Mon-Thu 4pm-10pm', 'Carlton', 'Prep veg, pasta station support, dish pit rotation. No experience needed — just speed and a good attitude.', 'active', now() + interval '30 days'),
    (v_emp2_id, v_circle_id, 'Weekend Server', 'casual', '$35/hr + tips', 35.00, 'hour', 'Sat-Sun 11am-10pm', 'Carlton', 'Full section serving. Busy Italian restaurant, weekend dinner rush. Tip pool averages $60/shift.', 'active', now() + interval '30 days');

  -- Northside Fulfilment (Brunswick East) — 3 jobs
  insert into jobs (employer_id, circle_id, title, job_type, pay_display, pay_amount, pay_period, hours_text, suburb, description, status, expires_at)
  values
    (v_emp3_id, v_circle_id, 'Warehouse Picker / Packer', 'casual', '$34/hr', 34.00, 'hour', 'Mon-Fri · 6am-2pm', 'Brunswick East', 'Handover, wrapping, RF scanning, and organized dispatch support. Forklift ticket is a bonus. Onsite parking.', 'active', now() + interval '30 days'),
    (v_emp3_id, v_circle_id, 'Forklift Operator', 'casual', '$38/hr', 38.00, 'hour', 'Mon-Fri 2pm-10pm', 'Brunswick East', 'Reach truck and counterbalance. Must have current LF licence. Food-grade warehouse — clean and warm.', 'active', now() + interval '30 days'),
    (v_emp3_id, v_circle_id, 'Returns Processor', 'part_time', '$600/week', 600.00, 'week', 'Wed-Sun 10am-3pm', 'Brunswick East', 'Process online returns, quality checks, re-stock items. Great for parents with school-hour availability.', 'active', now() + interval '30 days');

  -- Little Lane Cafe (Tullamarine) — 3 jobs
  insert into jobs (employer_id, circle_id, title, job_type, pay_display, pay_amount, pay_period, hours_text, suburb, description, status, expires_at)
  values
    (v_emp4_id, v_circle_id, 'Barista / All-rounder', 'casual', '$32/hr', 32.00, 'hour', 'Flexible · 5am-12pm', 'Tullamarine', 'Morning shifts at busy airport cafe. Espresso machine + counter service. Free staff meals.', 'active', now() + interval '30 days'),
    (v_emp4_id, v_circle_id, 'Food & Beverage Attendant', 'casual', '$30/hr', 30.00, 'hour', 'Weekends 7am-4pm', 'Tullamarine', 'Weekend breakfast/lunch shifts. Taking orders, serving, clearing. Training provided — no experience needed.', 'active', now() + interval '30 days'),
    (v_emp4_id, v_circle_id, 'Dishwasher / Kitchen Hand', 'casual', '$28/hr', 28.00, 'hour', 'Evenings 4pm-10pm', 'Tullamarine', 'Dish-pit and kitchen cleaning. Fast-paced but supportive team. Great for after-school or second job.', 'active', now() + interval '30 days');

  -- ====================================================================
  -- Demo Candidate: Mia Tran (Carlton)
  -- ====================================================================
  select id into v_candidate_id from auth.users where email = 'candidate.mia@hi-hired.demo';
  if v_candidate_id is null then
    insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user)
    values (gen_random_uuid(), 'candidate.mia@hi-hired.demo', crypt('hireme123', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}', false)
    returning id into v_candidate_id;
  end if;
  update profiles set
    role = 'candidate',
    full_name = 'Mia Tran',
    suburb = 'Carlton',
    skills = array['Coffee', 'POS', 'Table Service', 'Cash Handling'],
    availability_text = 'Mon-Thu mornings, weekends anytime',
    work_rights = 'Australian citizen (No restrictions)',
    experience_text = '2+ years across cafe open, POS, stock, and closing shifts. Friendly all-rounder with hospitality, retail, and counter experience.',
    onboarding_completed_at = now()
  where id = v_candidate_id;

  raise notice 'Seed complete: 4 demo employers, 12 jobs, 1 demo candidate';
end $$;
