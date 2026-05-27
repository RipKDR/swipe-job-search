-- Beachhead job seed data for MVP demo
-- Referenced by migration 016

-- Warehouse jobs
insert into jobs (
  employer_id,
  circle_id,
  title,
  job_type,
  pay_display,
  pay_amount,
  pay_period,
  hours_text,
  suburb,
  description,
  status,
  expires_at
)
select
  v_employer1_id,
  v_default_circle_id,
  'Warehouse Picker',
  'casual',
  '$32/hr',
  32.00,
  'hour',
  'Sat-Sun 6am-2pm',
  'Tullamarine',
  'Weekend shifts in clean, modern warehouse. Packing and picking orders. No heavy lifting. Forklift not required. Great team environment.',
  'active',
  now() + interval '30 days'
union all
select
  v_employer1_id,
  v_default_circle_id,
  'Forklift Driver',
  'casual',
  '$38/hr',
  38.00,
  'hour',
  'Mon-Fri 7am-3pm',
  'Tullamarine',
  'Forklift licence required. Operating reach truck in food-grade warehouse. Stable weekday shifts.',
  'active',
  now() + interval '30 days'
union all
select
  v_employer1_id,
  v_default_circle_id,
  'Order Packer (Evening)',
  'part_time',
  '$600/week',
  600.00,
  'week',
  'Mon-Fri 4pm-9pm',
  'Tullamarine',
  'Consistent evening part-time work. Pack online orders for next-day dispatch. Great for students or second job.',
  'active',
  now() + interval '30 days'
union all
select
  v_employer1_id,
  v_default_circle_id,
  'Warehouse Leading Hand',
  'permanent',
  '$65k/year',
  65000.00,
  'year',
  'Mon-Fri 8am-5pm',
  'Tullamarine',
  'Supervise team of 8 pickers. Roster planning, training new staff. Forklift + team leadership experience preferred.',
  'active',
  now() + interval '30 days';

-- Airport hospitality jobs
insert into jobs (
  employer_id,
  circle_id,
  title,
  job_type,
  pay_display,
  pay_amount,
  pay_period,
  hours_text,
  suburb,
  description,
  status,
  expires_at
)
select
  v_employer2_id,
  v_default_circle_id,
  'Barista',
  'casual',
  '$30/hr',
  30.00,
  'hour',
  'Flexible shifts 5am-2pm',
  'Tullamarine',
  'Busy airport cafe. Espresso machine experience required. Morning shifts. Tips + staff meals.',
  'active',
  now() + interval '30 days'
union all
select
  v_employer2_id,
  v_default_circle_id,
  'Kitchen Hand',
  'casual',
  '$28/hr',
  28.00,
  'hour',
  'Evenings 2pm-10pm',
  'Tullamarine',
  'Airport restaurant kitchen. Dishwashing, prep, cleaning. Fast-paced but supportive team.',
  'active',
  now() + interval '30 days'
union all
select
  v_employer2_id,
  v_default_circle_id,
  'Food & Beverage Attendant',
  'part_time',
  '$550/week',
  550.00,
  'week',
  'Weekends 7am-4pm',
  'Tullamarine',
  'Weekend breakfast/lunch shifts. Taking orders, serving, clearing tables. Training provided.',
  'active',
  now() + interval '30 days'
union all
select
  v_employer2_id,
  v_default_circle_id,
  'Shift Manager - Food Court',
  'permanent',
  '$58k/year',
  58000.00,
  'year',
  'Rotating roster incl. weekends',
  'Tullamarine',
  'Lead food court operations during your shift. Manage 4-6 staff, cash handling, ordering stock. Hospitality experience essential.',
  'active',
  now() + interval '30 days';
