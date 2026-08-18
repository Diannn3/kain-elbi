-- Safe live Places Ops access. Raw HMAC dedupe tokens remain hidden from staff clients.

alter table public.uppetite_place_feedback
  add column if not exists id uuid default gen_random_uuid();

update public.uppetite_place_feedback set id = gen_random_uuid() where id is null;
alter table public.uppetite_place_feedback alter column id set not null;
create unique index if not exists uppetite_place_feedback_id_idx on public.uppetite_place_feedback(id);

create or replace function public.get_uppetite_ops_feedback()
returns table (
  id uuid,
  place_id text,
  category text,
  event_day date,
  status text,
  created_at timestamptz,
  resolved_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_uppetite_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select f.id, f.place_id, f.category, f.event_day, f.status, f.created_at, f.resolved_at
    from public.uppetite_place_feedback as f
    order by f.created_at desc
    limit 2000;
end;
$$;

create or replace function public.get_uppetite_ops_audit()
returns table (
  id uuid,
  place_id text,
  field_name text,
  action text,
  before_value jsonb,
  after_value jsonb,
  source text,
  actor_ref text,
  reason text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_uppetite_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select a.id, a.place_id, a.field_name, a.action, a.before_value, a.after_value,
           a.source, a.actor_ref, a.reason, a.created_at
    from public.uppetite_place_audit_log as a
    order by a.created_at desc
    limit 500;
end;
$$;

create or replace function public.set_uppetite_place_feedback_status(
  p_feedback_id uuid,
  p_status text,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.uppetite_place_feedback%rowtype;
  v_after public.uppetite_place_feedback%rowtype;
begin
  if not public.can_edit_uppetite_places() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_status not in ('open','reviewing','resolved','dismissed') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  select * into v_before
  from public.uppetite_place_feedback
  where id = p_feedback_id
  for update;
  if not found then return false; end if;

  update public.uppetite_place_feedback
  set status = p_status,
      resolved_at = case when p_status in ('resolved','dismissed') then now() else null end
  where id = p_feedback_id
  returning * into v_after;

  insert into public.uppetite_place_audit_log(
    place_id, field_name, action, before_value, after_value, source, actor_ref, reason
  ) values (
    v_after.place_id,
    'community_feedback',
    'updated',
    jsonb_build_object('feedback_id', v_before.id, 'category', v_before.category, 'status', v_before.status),
    jsonb_build_object('feedback_id', v_after.id, 'category', v_after.category, 'status', v_after.status),
    'places_ops',
    auth.uid()::text,
    nullif(trim(coalesce(p_reason, '')), '')
  );

  return true;
end;
$$;

revoke all on function public.get_uppetite_ops_feedback() from public, anon;
revoke all on function public.get_uppetite_ops_audit() from public, anon;
revoke all on function public.set_uppetite_place_feedback_status(uuid,text,text) from public, anon;
grant execute on function public.get_uppetite_ops_feedback() to authenticated, service_role;
grant execute on function public.get_uppetite_ops_audit() to authenticated, service_role;
grant execute on function public.set_uppetite_place_feedback_status(uuid,text,text) to authenticated, service_role;
