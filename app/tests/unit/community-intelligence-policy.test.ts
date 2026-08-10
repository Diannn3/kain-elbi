import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(process.cwd(), '..');
const migration = readFileSync(
	resolve(repoRoot, 'supabase/migrations/20260810134500_community_intelligence.sql'),
	'utf8',
);
const reportFunction = readFileSync(
	resolve(repoRoot, 'supabase/functions/community-report/index.ts'),
	'utf8',
);
const cryptoHelper = readFileSync(
	resolve(repoRoot, 'supabase/functions/_shared/crypto.ts'),
	'utf8',
);

describe('Release 3 privacy and ranking boundaries', () => {
	it('keeps all community tables behind RLS and revokes browser roles', () => {
		for (const table of [
			'uppetite_community_place_registry',
			'uppetite_community_interaction_events',
			'uppetite_community_rate_limits_daily',
			'uppetite_community_place_metrics_daily',
		]) {
			expect(migration).toContain(`alter table public.${table} enable row level security`);
			expect(migration).toContain(`revoke all on table public.${table} from anon, authenticated`);
		}
	});

	it('stores derived tokens instead of a raw installation id', () => {
		expect(migration).not.toMatch(/\binstall_id\b/);
		expect(migration).toContain('dedupe_token text primary key');
		expect(migration).toContain('daily_install_token text not null');
		expect(cryptoHelper).toContain("{ name: 'HMAC', hash: 'SHA-256' }");
		expect(cryptoHelper).toContain('UPPETITE_HMAC_SECRET');
	});

	it('accepts only explicit visit and accuracy events', () => {
		expect(reportFunction).toContain("'visit_reported'");
		expect(reportFunction).toContain("'accuracy_confirmed'");
		expect(reportFunction).not.toMatch(/latitude|longitude|originId|destinationId|routeHistory/i);
	});

	it('requires a five-person daily cohort before Community Pulse can surface a place', () => {
		expect(migration).toContain('daily.visit_reports >= 5');
		expect(migration).toContain("metric_day >= ((now() at time zone 'Asia/Manila')::date - 29)");
	});

	it('purges raw interaction rows after the 30-day window', () => {
		expect(migration).toContain('where event_day < v_today - 29');
	});
});
