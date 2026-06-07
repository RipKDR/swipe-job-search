-- Hi-Hired: Asuria Compliance Demo Seed Data
--
-- Creates realistic demo data for provider (Asuria) compliance demo readiness.
-- Environment: dev/staging/demo only (not for production).
--
-- Dependencies (must run before this migration):
--   - All base schema migrations (001-015)
--   - Compliance reports (021 + compliance_report_rows)
--   - Bulk swipe consent columns (022)
--   - Default circle (005)
--   - Seed data (016/018) — not required but compatible
--
-- Patterns used:
--   - DO block wrapping (transaction-safe until pg 17)
--   - select-then-insert for auth.users (partial unique index on email)
--   - UPDATE profiles after auth trigger creates base row
--   - ON CONFLICT DO NOTHING for inserts
--   - Fixed UUIDs in variables for cross-table relationships
--   - on-boarding trigger handles circle_members assignment
--
-- Safe to re-run — idempotent via email checks and ON CONFLICT.

do $$
declare
  -- Circle reference
  v_circle_id uuid;

  -- Provider (Asuria)
  v_provider_id uuid;

  -- Employer IDs
  v_emp1_id uuid;  -- Tullamarine Logistics
  v_emp2_id uuid;  -- Airport Concessions Group
  v_emp3_id uuid;  -- Northside Retail Collective

  -- Candidate IDs
  v_cand1_id uuid;  -- Sarah Chen
  v_cand2_id uuid;  -- James Wilson
  v_cand3_id uuid;  -- Maria Santos
  v_cand4_id uuid;  -- Ahmed Hassan
  v_cand5_id uuid;  -- Chloe Taylor
  v_cand6_id uuid;  -- Liam O'Brien
  v_cand7_id uuid;  -- Priya Sharma
  v_cand8_id uuid;  -- Tom Baker
  v_cand9_id uuid;  -- Emma Rodriguez
  v_cand10_id uuid; -- Jake Thompson

  -- Job IDs
  v_job1_id uuid;
  v_job2_id uuid;
  v_job3_id uuid;
  v_job4_id uuid;
  v_job5_id uuid;
  v_job6_id uuid;
  v_job7_id uuid;

  -- Match ID
  v_match1_id uuid;
  v_match2_id uuid;
  v_match3_id uuid;
  v_match4_id uuid;
  v_match5_id uuid;

  -- Compliance run ID
  v_run_id uuid;
  v_report1_id uuid;
  v_report2_id uuid;

  -- Candidate array (for potential future use)
  v_candidate_ids uuid[] := '{}';

  -- Temporary helper
  v_tmp_id uuid;
begin
  -- ====================================================================
  -- 1. DEFAULT CIRCLE
  -- ====================================================================
  select id into v_circle_id from circles where is_default = true limit 1;
  if v_circle_id is null then
    insert into circles (name, suburb_anchor, is_default)
    values ('Northern Melbourne', 'Tullamarine', true)
    returning id into v_circle_id;
  end if;

  -- ====================================================================
  -- 2. PROVIDER: Asuria (Workforce Australia provider)
  -- ====================================================================
  select id into v_provider_id from auth.users
  where email = 'provider.asuria@hi-hired.demo';

  if v_provider_id is null then
    insert into auth.users (
      id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user
    ) values (
      gen_random_uuid(),
      'provider.asuria@hi-hired.demo',
      crypt('hireme123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email"}', '{}', false
    )
    returning id into v_provider_id;
  end if;

  -- The auth trigger creates a base profile + notification_preferences row.
  -- We update in place rather than re-insert.
  update profiles set
    role = 'provider',
    full_name = 'Asuria',
    suburb = 'Melbourne CBD',
    onboarding_completed_at = now()
  where id = v_provider_id;

  -- ====================================================================
  -- 3. EMPLOYERS (3 accounts with complete profiles)
  -- ====================================================================

  -- ── Employer 1: Tullamarine Logistics ──────────────────────────────
  select id into v_emp1_id from auth.users
  where email = 'employer.tullogistics@hi-hired.demo';

  if v_emp1_id is null then
    insert into auth.users (
      id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user
    ) values (
      gen_random_uuid(),
      'employer.tullogistics@hi-hired.demo',
      crypt('hireme123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email"}', '{}', false
    )
    returning id into v_emp1_id;
  end if;

  update profiles set
    role = 'employer',
    full_name = 'Tullamarine Logistics',
    suburb = 'Tullamarine',
    onboarding_completed_at = now()
  where id = v_emp1_id;

  insert into employer_profiles (
    profile_id, business_name, about_text, verified, contact_name
  ) values (
    v_emp1_id,
    'Tullamarine Logistics',
    'Full-service warehousing and distribution in Melbourne''s north. We move goods fast and safely. Casual and permanent roles available with flexible rosters.',
    true,
    'David Chen'
  ) on conflict (profile_id) do nothing;

  -- ── Employer 2: Airport Concessions Group ─────────────────────────
  select id into v_emp2_id from auth.users
  where email = 'employer.airport-concessions@hi-hired.demo';

  if v_emp2_id is null then
    insert into auth.users (
      id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user
    ) values (
      gen_random_uuid(),
      'employer.airport-concessions@hi-hired.demo',
      crypt('hireme123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email"}', '{}', false
    )
    returning id into v_emp2_id;
  end if;

  update profiles set
    role = 'employer',
    full_name = 'Airport Concessions Group',
    suburb = 'Tullamarine',
    onboarding_completed_at = now()
  where id = v_emp2_id;

  insert into employer_profiles (
    profile_id, business_name, about_text, verified, contact_name
  ) values (
    v_emp2_id,
    'Airport Concessions Group',
    'Melbourne Airport retail and F&B concessions. Fast-paced shifts, great team culture, and staff meal benefits across all venues.',
    true,
    'Samantha Lee'
  ) on conflict (profile_id) do nothing;

  -- ── Employer 3: Northside Retail Collective ────────────────────────
  select id into v_emp3_id from auth.users
  where email = 'employer.northside-retail@hi-hired.demo';

  if v_emp3_id is null then
    insert into auth.users (
      id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user
    ) values (
      gen_random_uuid(),
      'employer.northside-retail@hi-hired.demo',
      crypt('hireme123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email"}', '{}', false
    )
    returning id into v_emp3_id;
  end if;

  update profiles set
    role = 'employer',
    full_name = 'Northside Retail Collective',
    suburb = 'Brunswick',
    onboarding_completed_at = now()
  where id = v_emp3_id;

  insert into employer_profiles (
    profile_id, business_name, about_text, verified, contact_name
  ) values (
    v_emp3_id,
    'Northside Retail Collective',
    'Brunswick''s go-to for fashion, homewares, and gifts. We value customer service and offer consistent weekday and weekend rosters.',
    true,
    'Marcus Webb'
  ) on conflict (profile_id) do nothing;

  -- ====================================================================
  -- 4. CANDIDATES (10 profiles with diverse backgrounds)
  -- ====================================================================

  -- ── Candidate 1: Sarah Chen ────────────────────────────────────────
  select id into v_cand1_id from auth.users
  where email = 'candidate.sarah.chen@hi-hired.demo';

  if v_cand1_id is null then
    insert into auth.users (
      id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user
    ) values (
      gen_random_uuid(),
      'candidate.sarah.chen@hi-hired.demo',
      crypt('hireme123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email"}', '{}', false
    )
    returning id into v_cand1_id;
  end if;

  update profiles set
    role = 'candidate',
    full_name = 'Sarah Chen',
    suburb = 'Carlton',
    skills = array['Customer Service', 'POS', 'Table Service', 'Mandarin'],
    availability_text = 'Mon-Sat 8am-4pm, Sunday anytime',
    work_rights = 'Working Holiday Visa (No restrictions)',
    experience_text = '3 years F&B experience in Melbourne CBD. Waitressing, bar work, and functions. Strong English and Mandarin, fast learner, great with customers.',
    onboarding_completed_at = now()
  where id = v_cand1_id;
  v_candidate_ids := array_append(v_candidate_ids, v_cand1_id);

  -- Set bulk swipe consent via direct column update
  update profiles set bulk_swipe_consent = true, consent_granted_at = now()
  where id = v_cand1_id and bulk_swipe_consent = false;

  -- ── Candidate 2: James Wilson ──────────────────────────────────────
  select id into v_cand2_id from auth.users
  where email = 'candidate.james.wilson@hi-hired.demo';

  if v_cand2_id is null then
    insert into auth.users (
      id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user
    ) values (
      gen_random_uuid(),
      'candidate.james.wilson@hi-hired.demo',
      crypt('hireme123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email"}', '{}', false
    )
    returning id into v_cand2_id;
  end if;

  update profiles set
    role = 'candidate',
    full_name = 'James Wilson',
    suburb = 'Brunswick',
    skills = array['Hospitality', 'Coffee', 'Kitchen Hand', 'Cleaning'],
    availability_text = 'Weekends and weekday evenings after 5pm',
    work_rights = 'Australian Permanent Resident',
    experience_text = 'Part-time hospitality student. 18 months in cafes and fast food. Reliable, punctual, loves early morning starts.',
    onboarding_completed_at = now()
  where id = v_cand2_id;
  v_candidate_ids := array_append(v_candidate_ids, v_cand2_id);

  update profiles set bulk_swipe_consent = true, consent_granted_at = now()
  where id = v_cand2_id and bulk_swipe_consent = false;

  -- ── Candidate 3: Maria Santos ──────────────────────────────────────
  select id into v_cand3_id from auth.users
  where email = 'candidate.maria.santos@hi-hired.demo';

  if v_cand3_id is null then
    insert into auth.users (
      id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user
    ) values (
      gen_random_uuid(),
      'candidate.maria.santos@hi-hired.demo',
      crypt('hireme123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email"}', '{}', false
    )
    returning id into v_cand3_id;
  end if;

  update profiles set
    role = 'candidate',
    full_name = 'Maria Santos',
    suburb = 'Coburg',
    skills = array['Housekeeping', 'Kitchen Hand', 'Cleaning', 'Team Player'],
    availability_text = 'Any shift, any day. Prefer mornings.',
    work_rights = 'Working Holiday Visa (Filipino)',
    experience_text = '2 years housekeeping and kitchen hand experience in Sydney and Melbourne. Hardworking, detail-oriented, reliable.',
    onboarding_completed_at = now()
  where id = v_cand3_id;
  v_candidate_ids := array_append(v_candidate_ids, v_cand3_id);

  update profiles set bulk_swipe_consent = true, consent_granted_at = now()
  where id = v_cand3_id and bulk_swipe_consent = false;

  -- ── Candidate 4: Ahmed Hassan ─────────────────────────────────────
  select id into v_cand4_id from auth.users
  where email = 'candidate.ahmed.hassan@hi-hired.demo';

  if v_cand4_id is null then
    insert into auth.users (
      id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user
    ) values (
      gen_random_uuid(),
      'candidate.ahmed.hassan@hi-hired.demo',
      crypt('hireme123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email"}', '{}', false
    )
    returning id into v_cand4_id;
  end if;

  update profiles set
    role = 'candidate',
    full_name = 'Ahmed Hassan',
    suburb = 'Glenroy',
    skills = array['Warehouse', 'RF Scanning', 'Forklift (LF)', 'Manual Handling'],
    availability_text = 'Mon-Fri 6am-6pm, weekends negotiable',
    work_rights = 'Australian Permanent Resident',
    experience_text = '4 years warehouse experience in Egypt and Australia. Forklift LF licence, RF scanning, picking/packing. Keen for stable work.',
    onboarding_completed_at = now()
  where id = v_cand4_id;
  v_candidate_ids := array_append(v_candidate_ids, v_cand4_id);

  -- ── Candidate 5: Chloe Taylor ─────────────────────────────────────
  select id into v_cand5_id from auth.users
  where email = 'candidate.chloe.taylor@hi-hired.demo';

  if v_cand5_id is null then
    insert into auth.users (
      id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user
    ) values (
      gen_random_uuid(),
      'candidate.chloe.taylor@hi-hired.demo',
      crypt('hireme123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email"}', '{}', false
    )
    returning id into v_cand5_id;
  end if;

  update profiles set
    role = 'candidate',
    full_name = 'Chloe Taylor',
    suburb = 'Pascoe Vale',
    skills = array['Barista', 'Customer Service', 'Cash Handling', 'Food Safety'],
    availability_text = 'Early mornings 5am-12pm, 7 days',
    work_rights = 'Australian Citizen',
    experience_text = '2 years as barista/all-rounder in suburban cafes. Love early starts, great coffee, and fast-paced service. Available immediately.',
    onboarding_completed_at = now()
  where id = v_cand5_id;
  v_candidate_ids := array_append(v_candidate_ids, v_cand5_id);

  update profiles set bulk_swipe_consent = true, consent_granted_at = now()
  where id = v_cand5_id and bulk_swipe_consent = false;

  -- ── Candidate 6: Liam O'Brien ─────────────────────────────────────
  select id into v_cand6_id from auth.users
  where email = 'candidate.liam.obrien@hi-hired.demo';

  if v_cand6_id is null then
    insert into auth.users (
      id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user
    ) values (
      gen_random_uuid(),
      'candidate.liam.obrien@hi-hired.demo',
      crypt('hireme123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email"}', '{}', false
    )
    returning id into v_cand6_id;
  end if;

  update profiles set
    role = 'candidate',
    full_name = 'Liam O''Brien',
    suburb = 'Fawkner',
    skills = array['Warehouse', 'Forklift (LF)', 'Forklift (LO)', 'Order Picking'],
    availability_text = 'Mon-Fri 7am-3pm',
    work_rights = 'Australian Citizen',
    experience_text = '5+ years warehousing. Forklift LF + LO licences, order picking, despatch. Looking for stable day shifts with a good team.',
    onboarding_completed_at = now()
  where id = v_cand6_id;
  v_candidate_ids := array_append(v_candidate_ids, v_cand6_id);

  -- ── Candidate 7: Priya Sharma ─────────────────────────────────────
  select id into v_cand7_id from auth.users
  where email = 'candidate.priya.sharma@hi-hired.demo';

  if v_cand7_id is null then
    insert into auth.users (
      id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user
    ) values (
      gen_random_uuid(),
      'candidate.priya.sharma@hi-hired.demo',
      crypt('hireme123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email"}', '{}', false
    )
    returning id into v_cand7_id;
  end if;

  update profiles set
    role = 'candidate',
    full_name = 'Priya Sharma',
    suburb = 'Carlton',
    skills = array['Retail', 'Visual Merchandising', 'POS', 'Customer Service'],
    availability_text = 'Weekends and weekday afternoons',
    work_rights = 'International Student (20 hrs/week during semester)',
    experience_text = '1 year retail sales at Myer Melbourne. Visual merchandising, stock management, and customer service. Available for weekend shifts year-round.',
    onboarding_completed_at = now()
  where id = v_cand7_id;
  v_candidate_ids := array_append(v_candidate_ids, v_cand7_id);

  update profiles set bulk_swipe_consent = true, consent_granted_at = now()
  where id = v_cand7_id and bulk_swipe_consent = false;

  -- ── Candidate 8: Tom Baker ────────────────────────────────────────
  select id into v_cand8_id from auth.users
  where email = 'candidate.tom.baker@hi-hired.demo';

  if v_cand8_id is null then
    insert into auth.users (
      id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user
    ) values (
      gen_random_uuid(),
      'candidate.tom.baker@hi-hired.demo',
      crypt('hireme123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email"}', '{}', false
    )
    returning id into v_cand8_id;
  end if;

  update profiles set
    role = 'candidate',
    full_name = 'Tom Baker',
    suburb = 'Reservoir',
    skills = array['Kitchen Hand', 'Dishwashing', 'Cleaning', 'Basic Food Prep'],
    availability_text = 'Evenings 4pm-10pm, weekends all day',
    work_rights = 'Australian Citizen',
    experience_text = 'School leaver looking for first job. Reliable, punctual, quick learner. Available for kitchen hand or cleaning shifts.',
    onboarding_completed_at = now()
  where id = v_cand8_id;
  v_candidate_ids := array_append(v_candidate_ids, v_cand8_id);

  update profiles set bulk_swipe_consent = true, consent_granted_at = now()
  where id = v_cand8_id and bulk_swipe_consent = false;

  -- ── Candidate 9: Emma Rodriguez ───────────────────────────────────
  select id into v_cand9_id from auth.users
  where email = 'candidate.emma.rodriguez@hi-hired.demo';

  if v_cand9_id is null then
    insert into auth.users (
      id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user
    ) values (
      gen_random_uuid(),
      'candidate.emma.rodriguez@hi-hired.demo',
      crypt('hireme123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email"}', '{}', false
    )
    returning id into v_cand9_id;
  end if;

  update profiles set
    role = 'candidate',
    full_name = 'Emma Rodriguez',
    suburb = 'Brunswick East',
    skills = array['Restaurant Management', 'Bar', 'Wine Knowledge', 'Team Leadership'],
    availability_text = 'Flexible — available all shifts',
    work_rights = 'Australian Citizen',
    experience_text = '7 years hospitality including 2 years as assistant restaurant manager. Strong wine knowledge, team training, and rostering. Looking for supervisor or management role.',
    onboarding_completed_at = now()
  where id = v_cand9_id;
  v_candidate_ids := array_append(v_candidate_ids, v_cand9_id);

  -- ── Candidate 10: Jake Thompson ───────────────────────────────────
  select id into v_cand10_id from auth.users
  where email = 'candidate.jake.thompson@hi-hired.demo';

  if v_cand10_id is null then
    insert into auth.users (
      id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user
    ) values (
      gen_random_uuid(),
      'candidate.jake.thompson@hi-hired.demo',
      crypt('hireme123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email"}', '{}', false
    )
    returning id into v_cand10_id;
  end if;

  update profiles set
    role = 'candidate',
    full_name = 'Jake Thompson',
    suburb = 'Tullamarine',
    skills = array['Warehouse', 'Forklift (LF)', 'Physical Labour', 'Manual Handling'],
    availability_text = 'Mon-Fri 6am-6pm',
    work_rights = 'Australian Citizen',
    experience_text = 'Former construction labourer transitioning to warehousing. Forklift LF licence, physically fit, reliable transport. Looking for ongoing casual work.',
    onboarding_completed_at = now()
  where id = v_cand10_id;
  v_candidate_ids := array_append(v_candidate_ids, v_cand10_id);

  update profiles set bulk_swipe_consent = true, consent_granted_at = now()
  where id = v_cand10_id and bulk_swipe_consent = false;

  -- ====================================================================
  -- 5. JOBS (7 jobs across hospitality/retail/shift work, varied statuses)
  -- ====================================================================

  -- Skip if jobs already exist for these employers
  if not exists (select 1 from jobs where employer_id = v_emp1_id limit 1) then

    -- Job 1: [Tullamarine Logistics] Warehouse Picker/Packer — active
    insert into jobs (
      employer_id, circle_id, title, job_type, pay_display, pay_amount,
      pay_period, hours_text, suburb, description, status, expires_at
    ) values (
      v_emp1_id, v_circle_id,
      'Warehouse Picker/Packer',
      'casual', '$34/hr', 34.00, 'hour',
      'Mon-Fri 6am-2pm',
      'Tullamarine',
      'Order picking, packing, and dispatch in a modern temperature-controlled warehouse. RF scanning training provided. No forklift required — great entry-level warehousing role.',
      'active', now() + interval '30 days'
    ) returning id into v_job1_id;

    -- Job 2: [Tullamarine Logistics] Forklift Operator — active
    insert into jobs (
      employer_id, circle_id, title, job_type, pay_display, pay_amount,
      pay_period, hours_text, suburb, description, status, expires_at
    ) values (
      v_emp1_id, v_circle_id,
      'Forklift Operator (Reach Truck)',
      'casual', '$39/hr', 39.00, 'hour',
      'Mon-Fri 2pm-10pm',
      'Tullamarine',
      'Reach truck operation in food-grade warehouse. Current LF licence essential. Loading/unloading trucks, put-away, replenishment. Stable afternoon shifts.',
      'active', now() + interval '30 days'
    ) returning id into v_job2_id;

    -- Job 3: [Tullamarine Logistics] Nightfill Assistant — hired (filled)
    insert into jobs (
      employer_id, circle_id, title, job_type, pay_display, pay_amount,
      pay_period, hours_text, suburb, description, status, expires_at, hired_at
    ) values (
      v_emp1_id, v_circle_id,
      'Nightfill Assistant',
      'casual', '$36/hr', 36.00, 'hour',
      'Night shift 10pm-6am (4 on, 3 off)',
      'Tullamarine',
      'Overnight stock replenishment and order consolidation. Physical role with great penalty rates. Perfect for night owls.',
      'hired', now() + interval '15 days', now() - interval '3 days'
    ) returning id into v_job3_id;

    -- Job 4: [Airport Concessions] Barista — active
    insert into jobs (
      employer_id, circle_id, title, job_type, pay_display, pay_amount,
      pay_period, hours_text, suburb, description, status, expires_at
    ) values (
      v_emp2_id, v_circle_id,
      'Barista (Airport Cafe)',
      'casual', '$33/hr', 33.00, 'hour',
      'Flexible 5am-1pm shifts, weekends required',
      'Tullamarine',
      'Airport cafe barista. Must love early starts and fast service. Espresso machine experience essential. Staff meals and parking included.',
      'active', now() + interval '30 days'
    ) returning id into v_job4_id;

    -- Job 5: [Airport Concessions] Food & Beverage Attendant — active
    insert into jobs (
      employer_id, circle_id, title, job_type, pay_display, pay_amount,
      pay_period, hours_text, suburb, description, status, expires_at
    ) values (
      v_emp2_id, v_circle_id,
      'Food & Beverage Attendant',
      'casual', '$30/hr', 30.00, 'hour',
      'Weekends 7am-4pm',
      'Tullamarine',
      'Weekend breakfast and lunch service. Taking orders, serving, clearing tables, some food prep. Training provided for the right candidate.',
      'active', now() + interval '30 days'
    ) returning id into v_job5_id;

    -- Job 6: [Airport Concessions] Kitchen Hand — expired
    insert into jobs (
      employer_id, circle_id, title, job_type, pay_display, pay_amount,
      pay_period, hours_text, suburb, description, status, expires_at
    ) values (
      v_emp2_id, v_circle_id,
      'Kitchen Hand (Evenings)',
      'casual', '$28/hr', 28.00, 'hour',
      'Mon-Fri 4pm-10pm',
      'Tullamarine',
      'Dishwashing, basic prep, and kitchen cleaning for busy airport restaurant. No experience needed — great first job.',
      'expired', now() - interval '7 days'
    ) returning id into v_job6_id;

    -- Job 7: [Northside Retail] Retail Sales Assistant — paused
    insert into jobs (
      employer_id, circle_id, title, job_type, pay_display, pay_amount,
      pay_period, hours_text, suburb, description, status, expires_at
    ) values (
      v_emp3_id, v_circle_id,
      'Retail Sales Assistant',
      'part_time', '$520/week', 520.00, 'week',
      'Wed-Sun 10am-4pm',
      'Brunswick',
      'Customer sales, visual merchandising, and stock management in a busy Brunswick boutique. Weekend availability required. Fashion interest a plus.',
      'paused', now() + interval '45 days'
    ) returning id into v_job7_id;

  end if;
  -- If jobs already exist, fetch the first 7 we can use for swipes/matches
  -- This allows the migration to work even if other seed data pre-exists
  if v_job1_id is null then
    select id into v_job1_id from jobs where employer_id = v_emp1_id and title like '%Picker%' limit 1;
  end if;
  if v_job2_id is null then
    select id into v_job2_id from jobs where employer_id = v_emp1_id and title like '%Forklift%' limit 1;
  end if;
  if v_job4_id is null then
    select id into v_job4_id from jobs where employer_id = v_emp2_id and title like '%Barista%' limit 1;
  end if;
  if v_job5_id is null then
    select id into v_job5_id from jobs where employer_id = v_emp2_id and title like '%Attendant%' limit 1;
  end if;

  -- ====================================================================
  -- 6. SWIPES (candidates swipe on jobs — creates interest notifications)
  -- ====================================================================

  -- Sarah Chen — interested in Barista (job4) and F&B Attendant (job5)
  insert into swipes (candidate_id, job_id, direction) values
    (v_cand1_id, v_job4_id, 'right'),
    (v_cand1_id, v_job5_id, 'right'),
    (v_cand1_id, v_job1_id, 'left')
  on conflict (candidate_id, job_id) do nothing;

  -- James Wilson — interested in Kitchen Hand (job6) and Picker (job1)
  insert into swipes (candidate_id, job_id, direction) values
    (v_cand2_id, v_job6_id, 'right'),
    (v_cand2_id, v_job1_id, 'right'),
    (v_cand2_id, v_job7_id, 'left')
  on conflict (candidate_id, job_id) do nothing;

  -- Maria Santos — interested in F&B (job5) and Kitchen Hand (job6)
  insert into swipes (candidate_id, job_id, direction) values
    (v_cand3_id, v_job5_id, 'right'),
    (v_cand3_id, v_job6_id, 'right')
  on conflict (candidate_id, job_id) do nothing;

  -- Ahmed Hassan — interested in Forklift (job2) and Picker (job1)
  insert into swipes (candidate_id, job_id, direction) values
    (v_cand4_id, v_job2_id, 'right'),
    (v_cand4_id, v_job1_id, 'right')
  on conflict (candidate_id, job_id) do nothing;

  -- Chloe Taylor — interested in Barista (job4)
  insert into swipes (candidate_id, job_id, direction) values
    (v_cand5_id, v_job4_id, 'right'),
    (v_cand5_id, v_job5_id, 'left'),
    (v_cand5_id, v_job1_id, 'left')
  on conflict (candidate_id, job_id) do nothing;

  -- Liam O'Brien — interested in Forklift (job2)
  insert into swipes (candidate_id, job_id, direction) values
    (v_cand6_id, v_job2_id, 'right'),
    (v_cand6_id, v_job1_id, 'right'),
    (v_cand6_id, v_job3_id, 'right')
  on conflict (candidate_id, job_id) do nothing;

  -- Priya Sharma — interested in Retail (job7)
  insert into swipes (candidate_id, job_id, direction) values
    (v_cand7_id, v_job7_id, 'right'),
    (v_cand7_id, v_job5_id, 'left')
  on conflict (candidate_id, job_id) do nothing;

  -- Tom Baker — interested in Kitchen Hand (job6)
  insert into swipes (candidate_id, job_id, direction) values
    (v_cand8_id, v_job6_id, 'right'),
    (v_cand8_id, v_job5_id, 'right')
  on conflict (candidate_id, job_id) do nothing;

  -- Emma Rodriguez — interested in F&B (job5) — right, Barista (job4) — left
  insert into swipes (candidate_id, job_id, direction) values
    (v_cand9_id, v_job5_id, 'right'),
    (v_cand9_id, v_job4_id, 'left')
  on conflict (candidate_id, job_id) do nothing;

  -- Jake Thompson — interested in Picker (job1) and Forklift (job2)
  insert into swipes (candidate_id, job_id, direction) values
    (v_cand10_id, v_job1_id, 'right'),
    (v_cand10_id, v_job2_id, 'right')
  on conflict (candidate_id, job_id) do nothing;

  -- ====================================================================
  -- 7. MATCHES (employers respond to interested candidates)
  -- ====================================================================

  -- Note: create_match() RPC enforces employer_id = auth.uid() and swipe existence.
  -- We insert directly with the service-role pattern used in seed scripts.

  -- Match 1: Sarah Chen × Barista (Airport) — chatting
  insert into matches (job_id, candidate_id, employer_id, initiated_by, status)
  values (v_job4_id, v_cand1_id, v_emp2_id, v_emp2_id, 'chatting')
  on conflict (job_id, candidate_id) do nothing
  returning id into v_match1_id;

  -- Match 2: Ahmed Hassan × Forklift (Tullamarine Logistics) — chatting
  insert into matches (job_id, candidate_id, employer_id, initiated_by, status)
  values (v_job2_id, v_cand4_id, v_emp1_id, v_emp1_id, 'chatting')
  on conflict (job_id, candidate_id) do nothing
  returning id into v_match2_id;

  -- Match 3: Chloe Taylor × Barista (Airport) — hired
  insert into matches (job_id, candidate_id, employer_id, initiated_by, status,
    candidate_hire_confirmed, employer_hire_confirmed,
    hire_initiated_by, hire_initiated_at, hired_at)
  values (v_job4_id, v_cand5_id, v_emp2_id, v_emp2_id, 'hired',
    true, true,
    v_emp2_id, now() - interval '10 days', now() - interval '8 days')
  on conflict (job_id, candidate_id) do nothing
  returning id into v_match3_id;

  -- Match 4: Liam O'Brien × Forklift (Tullamarine Logistics) — chatting
  insert into matches (job_id, candidate_id, employer_id, initiated_by, status)
  values (v_job2_id, v_cand6_id, v_emp1_id, v_emp1_id, 'chatting')
  on conflict (job_id, candidate_id) do nothing
  returning id into v_match4_id;

  -- Match 5: Jake Thompson × Picker (Tullamarine Logistics) — hired
  insert into matches (job_id, candidate_id, employer_id, initiated_by, status,
    candidate_hire_confirmed, employer_hire_confirmed,
    hire_initiated_by, hire_initiated_at, hired_at)
  values (v_job1_id, v_cand10_id, v_emp1_id, v_emp1_id, 'hired',
    true, true,
    v_emp1_id, now() - interval '5 days', now() - interval '3 days')
  on conflict (job_id, candidate_id) do nothing
  returning id into v_match5_id;

  -- ====================================================================
  -- 8. MESSAGES (chat history for matches)
  -- ====================================================================

  -- Messages for Match 1: Sarah Chen × Barista (Airport)
  if v_match1_id is not null and not exists (
    select 1 from messages where match_id = v_match1_id limit 1
  ) then
    insert into messages (match_id, sender_id, body, created_at) values
      (v_match1_id, v_emp2_id, 'Hi Sarah! Thanks for your interest in the Barista role at our airport cafe. Are you available for early morning shifts?', now() - interval '2 days'),
      (v_match1_id, v_cand1_id, 'Hi! Yes, I love early mornings. I can do 5am starts any day of the week. I have 3 years of cafe experience in the CBD.', now() - interval '2 days' + interval '2 hours'),
      (v_match1_id, v_emp2_id, 'That sounds perfect! We have a 5am-1pm shift available on weekends. Would you be free for a trial shift this Saturday?', now() - interval '1 day'),
      (v_match1_id, v_cand1_id, 'Saturday works great for me. 5am at the airport cafe? I''ll be there!', now() - interval '1 day' + interval '1 hour'),
      (v_match1_id, v_emp2_id, 'Perfect! See you Saturday at 5am. Please bring your bank details for onboarding.', now() - interval '20 hours');
  end if;

  -- Messages for Match 2: Ahmed Hassan × Forklift (Tullamarine Logistics)
  if v_match2_id is not null and not exists (
    select 1 from messages where match_id = v_match2_id limit 1
  ) then
    insert into messages (match_id, sender_id, body, created_at) values
      (v_match2_id, v_emp1_id, 'Hello Ahmed, I see you''re interested in the Forklift Operator role. Do you have a current LF licence?', now() - interval '4 days'),
      (v_match2_id, v_cand4_id, 'Yes, I have a current LF licence and 4 years of warehouse experience including reach truck operation.', now() - interval '4 days' + interval '3 hours'),
      (v_match2_id, v_emp1_id, 'Great, that''s exactly what we need. The role is afternoon shift 2pm-10pm Mon-Fri, $39/hr. Would that suit you?', now() - interval '3 days'),
      (v_match2_id, v_cand4_id, 'The afternoon shift works perfectly for me. I''m keen to start as soon as possible.', now() - interval '3 days' + interval '2 hours'),
      (v_match2_id, v_emp1_id, 'Excellent. Can you come in for an induction this Thursday at 1pm? Our address is 42 Logistics Drive, Tullamarine.', now() - interval '2 days');
  end if;

  -- Messages for Match 4: Liam O'Brien × Forklift (Tullamarine Logistics)
  if v_match4_id is not null and not exists (
    select 1 from messages where match_id = v_match4_id limit 1
  ) then
    insert into messages (match_id, sender_id, body, created_at) values
      (v_match4_id, v_emp1_id, 'Hey Liam, thanks for your interest in the Forklift Operator position. We have a vacancy on afternoon shift.', now() - interval '1 day'),
      (v_match4_id, v_cand6_id, 'Hi David, I''m very interested! I have LF + LO licences and 5+ years experience. Afternoon shift works great for me.', now() - interval '23 hours'),
      (v_match4_id, v_emp1_id, 'Brilliant. Would you be available for a quick phone chat tomorrow morning to discuss the details?', now() - interval '12 hours');
  end if;

  -- ====================================================================
  -- 9. COMPLIANCE DATA (demonstrates the compliance screen with real data)
  -- ====================================================================

  -- ── Compliance Report 1: Weekly summary for Sarah Chen ─────────────
  -- This is the primary report that the compliance screen will display.

  insert into compliance_reports (
    candidate_id, provider_id, period_start, period_end,
    report_type, status, report_data
  ) values (
    v_cand1_id, v_provider_id,
    (now() - interval '7 days')::date,
    now()::date,
    'weekly_summary',
    'completed',
    jsonb_build_object(
      'activity_summary', jsonb_build_object(
        'total_swipes', 12,
        'right_swipes', 6,
        'unique_jobs_interacted', 5,
        'total_matches', 1,
        'total_hires', 0,
        'candidate_rows', 1
      )
    )
  ) returning id into v_report1_id;

  -- Create a run for report 1
  insert into compliance_report_runs (
    report_id, status, total_candidates, completed_candidates,
    failed_candidates, started_at, completed_at
  ) values (
    v_report1_id, 'completed', 1, 1, 0,
    now() - interval '1 day', now() - interval '1 day' + interval '30 seconds'
  ) returning id into v_run_id;

  -- Create the row for report 1
  insert into compliance_report_rows (
    report_id, run_id, candidate_id, status,
    swipe_count, right_swipe_count, unique_jobs_interacted,
    match_count, hire_count,
    swipes_data, matches_data, hires_data,
    total_earnings
  ) values (
    v_report1_id, v_run_id, v_cand1_id, 'completed',
    12, 6, 5,
    1, 0,
    jsonb_build_object(
      'swipes', jsonb_build_array(
        jsonb_build_object('job_id', v_job4_id, 'direction', 'right', 'created_at', (now() - interval '6 days')::text),
        jsonb_build_object('job_id', v_job5_id, 'direction', 'right', 'created_at', (now() - interval '6 days')::text),
        jsonb_build_object('job_id', v_job1_id, 'direction', 'left', 'created_at', (now() - interval '5 days')::text),
        jsonb_build_object('job_id', v_job2_id, 'direction', 'right', 'created_at', (now() - interval '4 days')::text),
        jsonb_build_object('job_id', v_job7_id, 'direction', 'right', 'created_at', (now() - interval '3 days')::text)
      )
    ),
    jsonb_build_object(
      'matches', jsonb_build_array(
        jsonb_build_object('match_id', v_match1_id, 'job_title', 'Barista (Airport Cafe)', 'employer', 'Airport Concessions Group', 'status', 'chatting', 'created_at', (now() - interval '2 days')::text)
      )
    ),
    jsonb_build_object('hires', jsonb_build_array()),
    null
  );

  -- ── Compliance Report 2: Fortnightly report for Chloe Taylor (hired) ──
  -- Shows a completed hire in compliance data.

  insert into compliance_reports (
    candidate_id, provider_id, period_start, period_end,
    report_type, status, report_data
  ) values (
    v_cand5_id, v_provider_id,
    (now() - interval '14 days')::date,
    now()::date,
    'fortnightly',
    'completed',
    jsonb_build_object(
      'activity_summary', jsonb_build_object(
        'total_swipes', 8,
        'right_swipes', 3,
        'unique_jobs_interacted', 4,
        'total_matches', 1,
        'total_hires', 1,
        'candidate_rows', 1
      )
    )
  ) returning id into v_report2_id;

  -- Create a run for report 2
  insert into compliance_report_runs (
    report_id, status, total_candidates, completed_candidates,
    failed_candidates, started_at, completed_at
  ) values (
    v_report2_id, 'completed', 1, 1, 0,
    now() - interval '2 hours', now() - interval '1 hour'
  );

  -- Get the run_id we just created
  select id into v_run_id from compliance_report_runs
  where report_id = v_report2_id limit 1;

  -- Create the row for report 2
  insert into compliance_report_rows (
    report_id, run_id, candidate_id, status,
    swipe_count, right_swipe_count, unique_jobs_interacted,
    match_count, hire_count,
    swipes_data, matches_data, hires_data,
    total_earnings
  ) values (
    v_report2_id, v_run_id, v_cand5_id, 'completed',
    8, 3, 4,
    1, 1,
    jsonb_build_object(
      'swipes', jsonb_build_array(
        jsonb_build_object('job_id', v_job4_id, 'direction', 'right', 'created_at', (now() - interval '12 days')::text),
        jsonb_build_object('job_id', v_job5_id, 'direction', 'left', 'created_at', (now() - interval '11 days')::text),
        jsonb_build_object('job_id', v_job1_id, 'direction', 'left', 'created_at', (now() - interval '10 days')::text),
        jsonb_build_object('job_id', v_job7_id, 'direction', 'right', 'created_at', (now() - interval '9 days')::text)
      )
    ),
    jsonb_build_object(
      'matches', jsonb_build_array(
        jsonb_build_object('match_id', v_match3_id, 'job_title', 'Barista (Airport Cafe)', 'employer', 'Airport Concessions Group', 'status', 'hired', 'created_at', (now() - interval '10 days')::text)
      )
    ),
    jsonb_build_object(
      'hires', jsonb_build_array(
        jsonb_build_object('match_id', v_match3_id, 'job_title', 'Barista (Airport Cafe)', 'employer', 'Airport Concessions Group', 'hired_at', (now() - interval '8 days')::text, 'hourly_rate', 33.00)
      )
    ),
    1056.00  -- ~8 shifts × 4 hrs × $33/hr estimated earnings
  );

  -- ── Compliance Report 3: Monthly summary for Ahmed Hassan (chatting) ──
  -- Shows a different status and report type for variety.

  insert into compliance_reports (
    candidate_id, provider_id, period_start, period_end,
    report_type, status, report_data
  ) values (
    v_cand4_id, v_provider_id,
    (now() - interval '30 days')::date,
    now()::date,
    'monthly',
    'completed',
    jsonb_build_object(
      'activity_summary', jsonb_build_object(
        'total_swipes', 18,
        'right_swipes', 9,
        'unique_jobs_interacted', 7,
        'total_matches', 1,
        'total_hires', 0,
        'candidate_rows', 1
      )
    )
  );

  -- Get the report 3 id
  select id into v_report1_id from compliance_reports
  where candidate_id = v_cand4_id and provider_id = v_provider_id
  order by created_at desc limit 1;

  -- Run + row for report 3
  insert into compliance_report_runs (
    report_id, status, total_candidates, completed_candidates,
    failed_candidates, started_at, completed_at
  ) values (
    v_report1_id, 'completed', 1, 1, 0,
    now() - interval '3 days', now() - interval '3 days' + interval '45 seconds'
  ) returning id into v_run_id;

  insert into compliance_report_rows (
    report_id, run_id, candidate_id, status,
    swipe_count, right_swipe_count, unique_jobs_interacted,
    match_count, hire_count,
    swipes_data, matches_data, hires_data,
    total_earnings
  ) values (
    v_report1_id, v_run_id, v_cand4_id, 'completed',
    18, 9, 7,
    1, 0,
    jsonb_build_object(
      'swipes', jsonb_build_array(
        jsonb_build_object('job_id', v_job2_id, 'direction', 'right', 'created_at', (now() - interval '25 days')::text),
        jsonb_build_object('job_id', v_job1_id, 'direction', 'right', 'created_at', (now() - interval '24 days')::text),
        jsonb_build_object('job_id', v_job3_id, 'direction', 'right', 'created_at', (now() - interval '20 days')::text),
        jsonb_build_object('job_id', v_job4_id, 'direction', 'left', 'created_at', (now() - interval '15 days')::text),
        jsonb_build_object('job_id', v_job7_id, 'direction', 'right', 'created_at', (now() - interval '12 days')::text)
      )
    ),
    jsonb_build_object(
      'matches', jsonb_build_array(
        jsonb_build_object('match_id', v_match2_id, 'job_title', 'Forklift Operator (Reach Truck)', 'employer', 'Tullamarine Logistics', 'status', 'chatting', 'created_at', (now() - interval '4 days')::text)
      )
    ),
    jsonb_build_object('hires', jsonb_build_array()),
    null
  );

  raise notice 'Asuria demo seed complete: 1 provider, 3 employers, 10 candidates, 7 jobs (4 active/1 hired/1 paused/1 expired), swipes, matches, messages, 3 compliance reports with rows';
end $$;
