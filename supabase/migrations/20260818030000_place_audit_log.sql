-- UPPETITE Feature 5: append-only reviewed place-change audit.
-- This table is service-only. Browser roles receive no table or function access.

create table if not exists public.uppetite_place_audit_log (
  id uuid primary key default gen_random_uuid(),
  place_id text not null,
  field_name text not null,
  action text not null check (action in ('created','updated','verified','shop_verified','closed','reopened')),
  before_value jsonb,
  after_value jsonb,
  source text not null,
  actor_ref text,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists uppetite_place_audit_place_idx
  on public.uppetite_place_audit_log(place_id, created_at desc);
create index if not exists uppetite_place_audit_created_idx
  on public.uppetite_place_audit_log(created_at desc);

alter table public.uppetite_place_audit_log enable row level security;
revoke all on table public.uppetite_place_audit_log from anon, authenticated;
-- Append-only for service workflows. History can be read and appended, not rewritten/deleted.
revoke update, delete, truncate on table public.uppetite_place_audit_log from service_role;
grant select, insert on table public.uppetite_place_audit_log to service_role;

create or replace function public.append_uppetite_place_audit(
  p_place_id text,
  p_field_name text,
  p_action text,
  p_before_value jsonb,
  p_after_value jsonb,
  p_source text,
  p_actor_ref text default null,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_action not in ('created','updated','verified','shop_verified','closed','reopened') then
    raise exception 'invalid_action' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_place_id, ''))) = 0
    or length(trim(coalesce(p_field_name, ''))) = 0
    or length(trim(coalesce(p_source, ''))) = 0 then
    raise exception 'invalid_audit_input' using errcode = '22023';
  end if;

  insert into public.uppetite_place_audit_log(
    place_id, field_name, action, before_value, after_value, source, actor_ref, reason
  ) values (
    trim(p_place_id), trim(p_field_name), p_action, p_before_value, p_after_value,
    trim(p_source), nullif(trim(coalesce(p_actor_ref, '')), ''), nullif(trim(coalesce(p_reason, '')), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.append_uppetite_place_audit(text,text,text,jsonb,jsonb,text,text,text)
  from public, anon, authenticated;
grant execute on function public.append_uppetite_place_audit(text,text,text,jsonb,jsonb,text,text,text)
  to service_role;
