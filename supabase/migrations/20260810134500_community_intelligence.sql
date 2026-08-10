-- UPPETITE Release 3: privacy-preserving community intelligence.
-- Raw browser installation IDs never enter Postgres. Edge Functions derive
-- HMAC tokens before calling the database RPCs below.

create extension if not exists pg_cron with schema extensions;

create table if not exists public.uppetite_community_place_registry (
	place_id text primary key,
	zone_id text,
	active boolean not null default true,
	updated_at timestamptz not null default now()
);

create table if not exists public.uppetite_community_interaction_events (
	dedupe_token text primary key,
	event_type text not null check (event_type in ('visit_reported', 'accuracy_confirmed')),
	place_id text not null references public.uppetite_community_place_registry(place_id) on update cascade on delete restrict,
	event_day date not null,
	created_at timestamptz not null default now()
);

create index if not exists uppetite_community_events_day_idx
	on public.uppetite_community_interaction_events (event_day, event_type);

create index if not exists uppetite_community_events_place_idx
	on public.uppetite_community_interaction_events (place_id, event_day);

create table if not exists public.uppetite_community_rate_limits_daily (
	daily_install_token text not null,
	event_day date not null,
	event_count integer not null default 0 check (event_count >= 0),
	updated_at timestamptz not null default now(),
	primary key (daily_install_token, event_day)
);

create table if not exists public.uppetite_community_place_metrics_daily (
	place_id text not null references public.uppetite_community_place_registry(place_id) on update cascade on delete restrict,
	metric_day date not null,
	visit_reports integer not null default 0 check (visit_reports >= 0),
	accuracy_confirmations integer not null default 0 check (accuracy_confirmations >= 0),
	primary key (place_id, metric_day)
);

alter table public.uppetite_community_place_registry enable row level security;
alter table public.uppetite_community_interaction_events enable row level security;
alter table public.uppetite_community_rate_limits_daily enable row level security;
alter table public.uppetite_community_place_metrics_daily enable row level security;

-- The browser never talks directly to these tables.
revoke all on table public.uppetite_community_place_registry from anon, authenticated;
revoke all on table public.uppetite_community_interaction_events from anon, authenticated;
revoke all on table public.uppetite_community_rate_limits_daily from anon, authenticated;
revoke all on table public.uppetite_community_place_metrics_daily from anon, authenticated;

grant select, insert, update, delete on table public.uppetite_community_place_registry to service_role;
grant select, insert, update, delete on table public.uppetite_community_interaction_events to service_role;
grant select, insert, update, delete on table public.uppetite_community_rate_limits_daily to service_role;
grant select, insert, update, delete on table public.uppetite_community_place_metrics_daily to service_role;

create or replace function public.record_uppetite_community_event(
	p_event_type text,
	p_place_id text,
	p_event_day date,
	p_dedupe_token text,
	p_daily_install_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_today date := (now() at time zone 'Asia/Manila')::date;
	v_count integer;
	v_rows integer;
begin
	if p_event_type not in ('visit_reported', 'accuracy_confirmed') then
		raise exception 'invalid_event_type' using errcode = '22023';
	end if;

	if p_event_day <> v_today then
		raise exception 'invalid_event_day' using errcode = '22023';
	end if;

	if length(p_dedupe_token) < 32 or length(p_daily_install_token) < 32 then
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
		select 1
		from public.uppetite_community_interaction_events
		where dedupe_token = p_dedupe_token
	) then
		return jsonb_build_object('accepted', false, 'duplicate', true);
	end if;

	insert into public.uppetite_community_rate_limits_daily (
		daily_install_token,
		event_day,
		event_count,
		updated_at
	)
	values (p_daily_install_token, p_event_day, 1, now())
	on conflict (daily_install_token, event_day)
	do update set
		event_count = public.uppetite_community_rate_limits_daily.event_count + 1,
		updated_at = now()
	returning event_count into v_count;

	if v_count > 30 then
		raise exception 'rate_limited' using errcode = 'P0001';
	end if;

	insert into public.uppetite_community_interaction_events (
		dedupe_token,
		event_type,
		place_id,
		event_day
	)
	values (
		p_dedupe_token,
		p_event_type,
		p_place_id,
		p_event_day
	)
	on conflict (dedupe_token) do nothing;

	get diagnostics v_rows = row_count;

	return jsonb_build_object(
		'accepted', v_rows = 1,
		'duplicate', v_rows = 0
	);
end;
$$;

revoke all on function public.record_uppetite_community_event(text, text, date, text, text) from public, anon, authenticated;
grant execute on function public.record_uppetite_community_event(text, text, date, text, text) to service_role;

create or replace function public.refresh_uppetite_community_metrics()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	v_today date := (now() at time zone 'Asia/Manila')::date;
begin
	delete from public.uppetite_community_place_metrics_daily
	where metric_day between v_today - 30 and v_today;

	insert into public.uppetite_community_place_metrics_daily (
		place_id,
		metric_day,
		visit_reports,
		accuracy_confirmations
	)
	select
		place_id,
		event_day,
		count(*) filter (where event_type = 'visit_reported')::integer,
		count(*) filter (where event_type = 'accuracy_confirmed')::integer
	from public.uppetite_community_interaction_events
	where event_day between v_today - 30 and v_today
	group by place_id, event_day
	on conflict (place_id, metric_day)
	do update set
		visit_reports = excluded.visit_reports,
		accuracy_confirmations = excluded.accuracy_confirmations;

	delete from public.uppetite_community_place_metrics_daily
	where metric_day < v_today - 180;
end;
$$;

revoke all on function public.refresh_uppetite_community_metrics() from public, anon, authenticated;
grant execute on function public.refresh_uppetite_community_metrics() to service_role;

create or replace function public.uppetite_community_maintenance()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	v_today date := (now() at time zone 'Asia/Manila')::date;
begin
	perform public.refresh_uppetite_community_metrics();

	delete from public.uppetite_community_interaction_events
	where event_day < v_today - 29;

	delete from public.uppetite_community_rate_limits_daily
	where event_day < v_today - 7;
end;
$$;

revoke all on function public.uppetite_community_maintenance() from public, anon, authenticated;
grant execute on function public.uppetite_community_maintenance() to service_role;

create or replace function public.get_uppetite_community_pulse(p_limit integer default 60)
returns table (
	place_id text,
	zone_id text,
	visit_reports_30d integer,
	accuracy_confirmations_30d integer,
	active_days_30d integer
)
language sql
stable
security definer
set search_path = public
as $$
	with totals as (
		select
			m.place_id,
			r.zone_id,
			sum(m.visit_reports)::integer as visit_reports_30d,
			sum(m.accuracy_confirmations)::integer as accuracy_confirmations_30d,
			count(*) filter (where m.visit_reports > 0)::integer as active_days_30d
		from public.uppetite_community_place_metrics_daily m
		join public.uppetite_community_place_registry r using (place_id)
		where
			r.active = true
			and m.metric_day >= ((now() at time zone 'Asia/Manila')::date - 29)
			and m.metric_day <= (now() at time zone 'Asia/Manila')::date
		group by m.place_id, r.zone_id
	)
	select
		t.place_id,
		t.zone_id,
		t.visit_reports_30d,
		t.accuracy_confirmations_30d,
		t.active_days_30d
	from totals t
	where
		t.visit_reports_30d >= 5
		and exists (
			select 1
			from public.uppetite_community_place_metrics_daily daily
			where
				daily.place_id = t.place_id
				and daily.metric_day >= ((now() at time zone 'Asia/Manila')::date - 29)
				and daily.metric_day <= (now() at time zone 'Asia/Manila')::date
				and daily.visit_reports >= 5
		)
	order by t.visit_reports_30d desc, t.place_id
	limit greatest(1, least(coalesce(p_limit, 60), 100));
$$;

revoke all on function public.get_uppetite_community_pulse(integer) from public, anon, authenticated;
grant execute on function public.get_uppetite_community_pulse(integer) to service_role;

-- Reconcile aggregates after midnight in Asia/Manila. Supabase Cron uses pg_cron.
do $$
declare
	v_job_id bigint;
begin
	select jobid into v_job_id
	from cron.job
	where jobname = 'uppetite-community-maintenance';

	if v_job_id is not null then
		perform cron.unschedule(v_job_id);
	end if;
end;
$$;

select cron.schedule(
	'uppetite-community-maintenance',
	'20 16 * * *',
	$$select public.uppetite_community_maintenance();$$
);
