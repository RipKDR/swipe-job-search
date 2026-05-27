-- Helper RPCs for hire confirmation and unmatch

-- Confirm hire (dual confirmation flow)
create or replace function public.confirm_hire(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match matches%rowtype;
  v_caller_is_candidate boolean;
  v_caller_is_employer boolean;
begin
  select * into v_match from matches
  where id = p_match_id
    and (candidate_id = auth.uid() or employer_id = auth.uid());

  if not found then
    raise exception 'MATCH_NOT_FOUND_OR_FORBIDDEN';
  end if;

  v_caller_is_candidate := v_match.candidate_id = auth.uid();
  v_caller_is_employer := v_match.employer_id = auth.uid();

  -- First party to confirm: set hire_initiated fields and status
  if v_match.hire_initiated_by is null then
    update matches set
      hire_initiated_by = auth.uid(),
      hire_initiated_at = now(),
      status = 'hire_pending',
      candidate_hire_confirmed = v_caller_is_candidate,
      employer_hire_confirmed = v_caller_is_employer,
      updated_at = now()
    where id = p_match_id;
  else
    -- Second party confirming
    update matches set
      candidate_hire_confirmed = case
        when v_caller_is_candidate then true
        else candidate_hire_confirmed
      end,
      employer_hire_confirmed = case
        when v_caller_is_employer then true
        else employer_hire_confirmed
      end,
      updated_at = now()
    where id = p_match_id;

    -- Check if both confirmed now
    select * into v_match from matches where id = p_match_id;

    if v_match.candidate_hire_confirmed and v_match.employer_hire_confirmed then
      update matches set
        status = 'hired',
        hired_at = now(),
        updated_at = now()
      where id = p_match_id;

      update jobs set
        status = 'hired',
        hired_at = now(),
        updated_at = now()
      where id = v_match.job_id;

      -- Enqueue hire confirmation notification
      insert into notification_queue (type, idempotency_key, payload)
      values (
        'hire_confirmed',
        'hire:' || p_match_id::text,
        jsonb_build_object(
          'match_id', p_match_id,
          'job_id', v_match.job_id,
          'candidate_id', v_match.candidate_id,
          'employer_id', v_match.employer_id
        )
      )
      on conflict (idempotency_key) do nothing;
    end if;
  end if;
end;
$$;

-- Unmatch
create or replace function public.unmatch(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update matches set
    status = 'unmatched',
    unmatched_at = now(),
    unmatched_by = auth.uid(),
    updated_at = now()
  where id = p_match_id
    and (candidate_id = auth.uid() or employer_id = auth.uid())
    and status != 'unmatched';

  if not found then
    raise exception 'MATCH_NOT_FOUND_OR_FORBIDDEN';
  end if;
end;
$$;
