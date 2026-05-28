-- Atomic employer onboarding: profile + employer_profiles + completion timestamp

create or replace function public.complete_employer_onboarding(
  p_suburb text,
  p_avatar_url text,
  p_business_name text,
  p_contact_name text,
  p_about_text text default null
)
returns profiles
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_profile profiles%rowtype;
begin
  if v_profile_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  update profiles
  set
    role = 'employer',
    suburb = p_suburb,
    avatar_url = p_avatar_url,
    updated_at = now()
  where id = v_profile_id;

  insert into employer_profiles (profile_id, business_name, contact_name, about_text)
  values (v_profile_id, p_business_name, p_contact_name, p_about_text)
  on conflict (profile_id) do update
  set
    business_name = excluded.business_name,
    contact_name = excluded.contact_name,
    about_text = excluded.about_text,
    updated_at = now();

  update profiles
  set
    onboarding_completed_at = now(),
    updated_at = now()
  where id = v_profile_id
  returning * into v_profile;

  return v_profile;
end;
$$;

grant execute on function public.complete_employer_onboarding(text, text, text, text, text) to authenticated;
