begin;
select plan(11);

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('20000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner-editor@test.local', now(), now()),
  ('20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'places-editor@test.local', now(), now())
on conflict (id) do nothing;

-- Keep this file independently runnable after staff_authorization.test.sql rollback.
insert into public.uppetite_staff_members(user_id, role, active)
values
  ('20000000-0000-0000-0000-000000000001', 'owner', true),
  ('20000000-0000-0000-0000-000000000002', 'places_editor', true)
on conflict (user_id) do update set role = excluded.role, active = excluded.active;

insert into public.uppetite_editor_picks(id, place_id, tagline, editor_note, reason_tags, sort_order, published)
values
 ('30000000-0000-0000-0000-000000000001','test-public-place','Published','Public note',array['sulit'],0,true),
 ('30000000-0000-0000-0000-000000000002','test-draft-place','Draft','Draft note',array['between-classes'],1,false)
on conflict (id) do nothing;

select ok((select relrowsecurity from pg_class where oid='public.uppetite_editor_picks'::regclass), 'Editor Picks has RLS enabled');

-- Anonymous sees published only.
set local role anon;
select is((select count(*) from public.uppetite_editor_picks), 1::bigint, 'anonymous sees only published picks');
select throws_ok($$insert into public.uppetite_editor_picks(place_id,tagline,editor_note) values('anon-write','x','x')$$, '42501', null, 'anonymous cannot insert');
reset role;

-- Places editor sees published only and cannot mutate editorial content.
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.uppetite_editor_picks), 1::bigint, 'Places Editor sees published picks only');
select throws_ok($$insert into public.uppetite_editor_picks(place_id,tagline,editor_note) values('editor-write','x','x')$$, '42501', null, 'Places Editor cannot insert Editor Picks');
select throws_ok($$update public.uppetite_editor_picks set tagline='nope' where place_id='test-public-place'$$, '42501', null, 'Places Editor cannot update Editor Picks');
reset role;

-- Owner can see drafts and fully manage editorial rows.
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.uppetite_editor_picks), 2::bigint, 'owner sees published and draft picks');
select lives_ok($$insert into public.uppetite_editor_picks(place_id,tagline,editor_note) values('owner-write','Owner','Owner note')$$, 'owner can insert');
select lives_ok($$update public.uppetite_editor_picks set tagline='Updated' where place_id='owner-write'$$, 'owner can update');
select lives_ok($$delete from public.uppetite_editor_picks where place_id='owner-write'$$, 'owner can delete');
select lives_ok($$select public.reorder_uppetite_editor_picks(array['30000000-0000-0000-0000-000000000002'::uuid,'30000000-0000-0000-0000-000000000001'::uuid])$$, 'owner can reorder');
select is((select sort_order from public.uppetite_editor_picks where id='30000000-0000-0000-0000-000000000002'), 0, 'reorder updates deterministic position');
reset role;

select * from finish();
rollback;
