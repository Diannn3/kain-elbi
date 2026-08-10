-- UPPETITE: atomic anonymous photo-upload rate limiting.
--
-- A separate counter avoids the race in count-then-insert logic. The browser
-- cannot write this table or invoke the function directly; the Edge Function
-- uses the service-role client after origin/API-key validation.

create table if not exists public.uppetite_community_photo_upload_limits (
	day date not null,
	installation_id_hash text not null,
	upload_count smallint not null default 0 check (upload_count >= 0 and upload_count <= 3),
	primary key (day, installation_id_hash)
);

alter table public.uppetite_community_photo_upload_limits enable row level security;
revoke all on table public.uppetite_community_photo_upload_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.uppetite_community_photo_upload_limits to service_role;

create or replace function public.uppetite_claim_photo_upload_slot(
	p_day date,
	p_installation_id_hash text,
	p_limit integer default 3
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
	claimed_count integer;
begin
	if p_day is null or p_installation_id_hash is null or length(p_installation_id_hash) < 32 then
		return false;
	end if;
	if p_limit < 1 or p_limit > 3 then
		raise exception 'invalid photo upload limit';
	end if;

	insert into public.uppetite_community_photo_upload_limits (day, installation_id_hash, upload_count)
	values (p_day, p_installation_id_hash, 1)
	on conflict (day, installation_id_hash)
	do update
	set upload_count = public.uppetite_community_photo_upload_limits.upload_count + 1
	where public.uppetite_community_photo_upload_limits.upload_count < p_limit
	returning upload_count into claimed_count;

	return claimed_count is not null;
end;
$$;

revoke all on function public.uppetite_claim_photo_upload_slot(date, text, integer) from public, anon, authenticated;
grant execute on function public.uppetite_claim_photo_upload_slot(date, text, integer) to service_role;
