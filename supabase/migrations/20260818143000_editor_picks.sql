-- Public editorial recommendations. Everyone may read published picks; only the active UPPETITE owner may write.

create table if not exists public.uppetite_editor_picks (
  id uuid primary key default gen_random_uuid(),
  place_id text not null unique,
  tagline text not null check (char_length(trim(tagline)) between 1 and 120),
  editor_note text not null check (char_length(trim(editor_note)) between 1 and 700),
  reason_tags text[] not null default '{}',
  sort_order integer not null default 0 check (sort_order >= 0),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reason_tags <@ array['between-classes','sulit','with-friends','coffee-tambay','worth-the-walk','freshie-starter']::text[])
);

create index if not exists uppetite_editor_picks_public_order_idx
  on public.uppetite_editor_picks(published, sort_order, updated_at desc);

create or replace function public.touch_uppetite_editor_pick_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists uppetite_editor_picks_touch_updated_at on public.uppetite_editor_picks;
create trigger uppetite_editor_picks_touch_updated_at
before update on public.uppetite_editor_picks
for each row execute function public.touch_uppetite_editor_pick_updated_at();

alter table public.uppetite_editor_picks enable row level security;
revoke all on table public.uppetite_editor_picks from anon, authenticated;
grant select on table public.uppetite_editor_picks to anon, authenticated;
grant insert, update, delete on table public.uppetite_editor_picks to authenticated;
grant all on table public.uppetite_editor_picks to service_role;

drop policy if exists uppetite_editor_picks_public_read on public.uppetite_editor_picks;
create policy uppetite_editor_picks_public_read on public.uppetite_editor_picks
for select to anon, authenticated
using (published = true or (select public.is_uppetite_owner()));

drop policy if exists uppetite_editor_picks_owner_insert on public.uppetite_editor_picks;
create policy uppetite_editor_picks_owner_insert on public.uppetite_editor_picks
for insert to authenticated
with check ((select public.is_uppetite_owner()));

drop policy if exists uppetite_editor_picks_owner_update on public.uppetite_editor_picks;
create policy uppetite_editor_picks_owner_update on public.uppetite_editor_picks
for update to authenticated
using ((select public.is_uppetite_owner()))
with check ((select public.is_uppetite_owner()));

drop policy if exists uppetite_editor_picks_owner_delete on public.uppetite_editor_picks;
create policy uppetite_editor_picks_owner_delete on public.uppetite_editor_picks
for delete to authenticated
using ((select public.is_uppetite_owner()));

create or replace function public.reorder_uppetite_editor_picks(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_uppetite_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_ids is null or cardinality(p_ids) = 0 then return; end if;
  if cardinality(p_ids) <> (select count(distinct value) from unnest(p_ids) as value) then
    raise exception 'duplicate_pick_id' using errcode = '22023';
  end if;
  if cardinality(p_ids) <> (select count(*)::integer from public.uppetite_editor_picks) then
    raise exception 'complete_order_required' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(p_ids) as submitted(id)
    left join public.uppetite_editor_picks pick on pick.id = submitted.id
    where pick.id is null
  ) then
    raise exception 'unknown_pick_id' using errcode = '22023';
  end if;

  update public.uppetite_editor_picks as pick
  set sort_order = ordered.ordinality - 1,
      updated_at = now()
  from unnest(p_ids) with ordinality as ordered(id, ordinality)
  where pick.id = ordered.id;
end;
$$;

revoke all on function public.reorder_uppetite_editor_picks(uuid[]) from public, anon;
grant execute on function public.reorder_uppetite_editor_picks(uuid[]) to authenticated, service_role;
