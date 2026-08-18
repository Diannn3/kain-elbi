begin;
select plan(12);

-- Stable UUID fixtures. We insert directly because Supabase local test DB owns auth schema.
insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner@test.local', now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'editor@test.local', now(), now()),
  ('10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'viewer@test.local', now(), now()),
  ('10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'revoked@test.local', now(), now()),
  ('10000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'plain@test.local', now(), now())
on conflict (id) do nothing;

insert into public.uppetite_staff_members(user_id, role, active)
values
  ('10000000-0000-0000-0000-000000000001', 'owner', true),
  ('10000000-0000-0000-0000-000000000002', 'places_editor', true),
  ('10000000-0000-0000-0000-000000000003', 'places_viewer', true),
  ('10000000-0000-0000-0000-000000000004', 'places_editor', false)
on conflict (user_id) do update set role = excluded.role, active = excluded.active;

select ok((select relrowsecurity from pg_class where oid='public.uppetite_staff_members'::regclass), 'staff membership has RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.uppetite_staff_access_audit'::regclass), 'access audit has RLS enabled');

-- Owner context.
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select ok(public.is_uppetite_staff(), 'owner is staff');
select ok(public.is_uppetite_owner(), 'owner is owner');
select ok(public.can_edit_uppetite_places(), 'owner can edit places');
select is((select count(*) from public.uppetite_staff_members), 4::bigint, 'owner can read roster');
reset role;

-- Editor context.
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select ok(public.is_uppetite_staff(), 'editor is staff');
select ok(not public.is_uppetite_owner(), 'editor is not owner');
select ok(public.can_edit_uppetite_places(), 'editor can edit places');
reset role;

-- Viewer context.
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select ok(public.is_uppetite_staff(), 'viewer is staff');
select ok(not public.can_edit_uppetite_places(), 'viewer cannot edit places');
reset role;

-- Revocation must be live, independent of token age.
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
set local role authenticated;
select ok(not public.is_uppetite_staff(), 'revoked membership immediately loses staff access');
reset role;

select * from finish();
rollback;
