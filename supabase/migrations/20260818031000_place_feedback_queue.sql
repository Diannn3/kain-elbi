-- UPPETITE Feature 7: privacy-preserving one-tap place feedback queue.
-- Raw browser installation IDs never enter Postgres. The Edge Function derives
-- HMAC tokens before invoking record_uppetite_place_feedback().

create table if not exists public.uppetite_place_feedback (
  dedupe_token text primary key,
  place_id text not null references public.uppetite_community_place_registry(place_id) on update cascade on delete restrict,
  category text not null check (category in ('hours_wrong','price_menu_wrong','location_wrong','closed','duplicate','other')),
  event_day date not null,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (
    (status in ('resolved','dismissed') and resolved_at is not null)
    or (status in ('open','reviewing') and resolved_at is null)
  )
);

create index if not exists uppetite_place_feedback_queue_idx
  on public.uppetite_place_feedback(status, event_day desc, category);
create index if not exists uppetite_place_feedback_place_idx
  on public.uppetite_place_feedback(place_id, event_day desc);

alter table public.uppetite_place_feedback enable row level security;
revoke all on table public.uppetite_place_feedback from anon, authenticated;
grant select, insert, update, delete on table public.uppetite_place_feedback to service_role;

create or replace function public.record_uppetite_place_feedback(
  p_category text,
  p_place_id text,
  p_event_day date,
  p_dedupe_token text,
  p_daily_install_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_count integer;
  v_rows integer;
begin
  if p_category not in ('hours_wrong','price_menu_wrong','location_wrong','closed','duplicate','other') then
    raise exception 'invalid_category' using errcode = '22023';
  end if;
  if p_event_day <> v_today then
    raise exception 'invalid_event_day' using errcode = '22023';
  end if;
  if length(coalesce(p_dedupe_token, '')) < 32 or length(coalesce(p_daily_install_token, '')) < 32 then
    raise exception 'invalid_token' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.uppetite_community_place_registry
    where place_id = p_place_id and active = true
  ) then
    raise exception 'unknown_place' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.uppetite_place_feedback where dedupe_token = p_dedupe_token
  ) then
    return jsonb_build_object('accepted', false, 'duplicate', true);
  end if;

  -- Reuse the existing per-installation/day community rate limiter.
  insert into public.uppetite_community_rate_limits_daily(
    daily_install_token, event_day, event_count, updated_at
  ) values (
    p_daily_install_token, p_event_day, 1, now()
  )
  on conflict(daily_install_token, event_day) do update
    set event_count = public.uppetite_community_rate_limits_daily.event_count + 1,
        updated_at = now()
  returning event_count into v_count;

  if v_count > 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.uppetite_place_feedback(dedupe_token, place_id, category, event_day)
  values(p_dedupe_token, p_place_id, p_category, p_event_day)
  on conflict(dedupe_token) do nothing;
  get diagnostics v_rows = row_count;

  return jsonb_build_object('accepted', v_rows = 1, 'duplicate', v_rows = 0);
end;
$$;

revoke all on function public.record_uppetite_place_feedback(text,text,date,text,text)
  from public, anon, authenticated;
grant execute on function public.record_uppetite_place_feedback(text,text,date,text,text)
  to service_role;
