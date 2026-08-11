-- UPPETITE compliance foundation:
-- 1) versioned contributor-license evidence
-- 2) private moderated photo storage
-- 3) enforceable pending/rejected photo retention timestamps

alter table public.uppetite_community_place_photos
	add column if not exists contributor_terms_version text,
	add column if not exists license_accepted_at timestamptz,
	add column if not exists moderated_at timestamptz,
	add column if not exists expires_at timestamptz;

update public.uppetite_community_place_photos
set expires_at = case
	when status = 'pending' then created_at + interval '30 days'
	when status = 'rejected' then created_at + interval '7 days'
	else null
end
where expires_at is null;

create or replace function public.uppetite_photo_retention_defaults()
returns trigger
language plpgsql
set search_path = public
as $$
begin
	if tg_op = 'INSERT' and new.status = 'pending' and new.expires_at is null then
		new.expires_at := now() + interval '30 days';
	end if;

	if tg_op = 'UPDATE' and new.status is distinct from old.status then
		new.moderated_at := now();
		if new.status = 'approved' then
			new.expires_at := null;
		elsif new.status = 'rejected' then
			new.expires_at := now() + interval '7 days';
		elsif new.status = 'pending' then
			new.expires_at := now() + interval '30 days';
		end if;
	end if;

	return new;
end;
$$;

drop trigger if exists uppetite_photo_retention_defaults on public.uppetite_community_place_photos;
create trigger uppetite_photo_retention_defaults
before insert or update on public.uppetite_community_place_photos
for each row execute function public.uppetite_photo_retention_defaults();

drop policy if exists "Approved photos are publicly visible"
	on public.uppetite_community_place_photos;

create policy "Approved licensed photos are publicly visible"
	on public.uppetite_community_place_photos for select
	to public, anon, authenticated
	using (
		status = 'approved'
		and contributor_terms_version is not null
		and license_accepted_at is not null
	);

update storage.buckets
set public = false
where id = 'place-photos';
