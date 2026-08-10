-- UPPETITE Release 4: Native Photo Uploads
-- This table tracks uploaded photos and their moderation status.
-- The actual image files live in the 'place-photos' Supabase Storage bucket.

create table if not exists public.uppetite_community_place_photos (
	id uuid primary key default gen_random_uuid(),
	place_id text not null references public.uppetite_community_place_registry(place_id) on update cascade on delete cascade,
	storage_path text not null,
	installation_id_hash text not null,
	status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
	created_at timestamptz not null default now()
);

create index if not exists uppetite_community_place_photos_place_idx
	on public.uppetite_community_place_photos (place_id, status);

alter table public.uppetite_community_place_photos enable row level security;

-- Only approved photos are visible to the public.
create policy "Approved photos are publicly visible"
	on public.uppetite_community_place_photos for select
	to public, anon, authenticated
	using (status = 'approved');

-- The browser never inserts directly; it goes through the Edge Function
revoke insert, update, delete on table public.uppetite_community_place_photos from public, anon, authenticated;

grant select, insert, update, delete on table public.uppetite_community_place_photos to service_role;

-- Setup Storage bucket (if storage schema exists)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public) 
    values ('place-photos', 'place-photos', true)
    on conflict (id) do nothing;
  end if;
end $$;
