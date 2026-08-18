-- UPPETITE staff authentication and invite-only role foundation.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'uppetite_staff_role') then
    create type public.uppetite_staff_role as enum ('owner', 'places_editor', 'places_viewer');
  end if;
end
$$;

create table if not exists public.uppetite_staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.uppetite_staff_role not null,
  active boolean not null default true,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uppetite_single_active_owner_idx
  on public.uppetite_staff_members ((role))
  where role = 'owner'::public.uppetite_staff_role and active = true;

create table if not exists public.uppetite_staff_access_audit (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('invited','activated','role_changed','revoked')),
  old_role public.uppetite_staff_role,
  new_role public.uppetite_staff_role,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists uppetite_staff_access_audit_created_idx
  on public.uppetite_staff_access_audit(created_at desc);

create or replace function public.is_uppetite_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.uppetite_staff_members
    where user_id = (select auth.uid()) and active = true
  );
$$;

create or replace function public.is_uppetite_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.uppetite_staff_members
    where user_id = (select auth.uid())
      and active = true
      and role = 'owner'::public.uppetite_staff_role
  );
$$;

create or replace function public.can_edit_uppetite_places()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.uppetite_staff_members
    where user_id = (select auth.uid())
      and active = true
      and role in ('owner'::public.uppetite_staff_role, 'places_editor'::public.uppetite_staff_role)
  );
$$;

revoke all on function public.is_uppetite_staff() from public, anon;
revoke all on function public.is_uppetite_owner() from public, anon;
revoke all on function public.can_edit_uppetite_places() from public, anon;
grant execute on function public.is_uppetite_staff() to authenticated, service_role;
grant execute on function public.is_uppetite_owner() to authenticated, service_role;
grant execute on function public.can_edit_uppetite_places() to authenticated, service_role;

alter table public.uppetite_staff_members enable row level security;
alter table public.uppetite_staff_access_audit enable row level security;

revoke all on table public.uppetite_staff_members from anon, authenticated;
revoke all on table public.uppetite_staff_access_audit from anon, authenticated;
grant select on table public.uppetite_staff_members to authenticated;
grant select on table public.uppetite_staff_access_audit to authenticated;
grant all on table public.uppetite_staff_members to service_role;
grant all on table public.uppetite_staff_access_audit to service_role;

-- Users can discover only their own active/inactive membership. The owner can manage the roster.
drop policy if exists uppetite_staff_members_select on public.uppetite_staff_members;
create policy uppetite_staff_members_select on public.uppetite_staff_members
for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_uppetite_owner()));

drop policy if exists uppetite_staff_access_audit_owner_select on public.uppetite_staff_access_audit;
create policy uppetite_staff_access_audit_owner_select on public.uppetite_staff_access_audit
for select to authenticated
using ((select public.is_uppetite_owner()));

-- Roster mutations are intentionally RPC-only so the membership change and its audit record are atomic.
create or replace function public.set_uppetite_staff_access(
  p_target_user_id uuid,
  p_role public.uppetite_staff_role,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before public.uppetite_staff_members%rowtype;
  v_action text;
begin
  if not public.is_uppetite_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_target_user_id is null or p_target_user_id = (select auth.uid()) then
    raise exception 'invalid_target' using errcode = '22023';
  end if;
  if p_role = 'owner'::public.uppetite_staff_role then
    raise exception 'owner_role_not_assignable' using errcode = '22023';
  end if;

  select * into v_before
  from public.uppetite_staff_members
  where user_id = p_target_user_id
  for update;
  if not found or v_before.role = 'owner'::public.uppetite_staff_role then
    raise exception 'protected_or_unknown_membership' using errcode = '22023';
  end if;

  update public.uppetite_staff_members
  set role = p_role,
      active = p_active,
      updated_at = now()
  where user_id = p_target_user_id;

  v_action := case
    when v_before.active = true and p_active = false then 'revoked'
    when v_before.active = false and p_active = true then 'activated'
    when v_before.role is distinct from p_role then 'role_changed'
    else 'role_changed'
  end;

  insert into public.uppetite_staff_access_audit(
    target_user_id, action, old_role, new_role, actor_user_id
  ) values (
    p_target_user_id, v_action, v_before.role, p_role, (select auth.uid())
  );
end;
$$;

revoke all on function public.set_uppetite_staff_access(uuid, public.uppetite_staff_role, boolean) from public, anon;
grant execute on function public.set_uppetite_staff_access(uuid, public.uppetite_staff_role, boolean) to authenticated;

-- Called only by the server-side secret-key client after Supabase Auth creates an invited user.
create or replace function public.register_uppetite_staff_invite(
  p_target_user_id uuid,
  p_role public.uppetite_staff_role,
  p_actor_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_role = 'owner'::public.uppetite_staff_role then
    raise exception 'owner_role_not_assignable' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.uppetite_staff_members
    where user_id = p_actor_user_id
      and active = true
      and role = 'owner'::public.uppetite_staff_role
  ) then
    raise exception 'actor_not_owner' using errcode = '42501';
  end if;

  insert into public.uppetite_staff_members(user_id, role, active, invited_by, updated_at)
  values(p_target_user_id, p_role, true, p_actor_user_id, now())
  on conflict(user_id) do update set
    role = excluded.role,
    active = true,
    invited_by = excluded.invited_by,
    updated_at = now();

  insert into public.uppetite_staff_access_audit(
    target_user_id, action, new_role, actor_user_id
  ) values(p_target_user_id, 'invited', p_role, p_actor_user_id);
end;
$$;

revoke all on function public.register_uppetite_staff_invite(uuid, public.uppetite_staff_role, uuid) from public, anon, authenticated;
grant execute on function public.register_uppetite_staff_invite(uuid, public.uppetite_staff_role, uuid) to service_role;

-- No authenticated table mutation grants: access is revoked by active=false through the audited RPC.
