import { adminClient } from '../_shared/admin.ts';
import { publishableKeyAuthorized } from '../_shared/auth.ts';
import { corsHeaders, originAllowed } from '../_shared/cors.ts';
import { json } from '../_shared/response.ts';

Deno.serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: corsHeaders(req) });
	}
	if (req.method !== 'GET') return json(req, { error: 'method_not_allowed' }, 405);
	if (!originAllowed(req)) return json(req, { error: 'origin_not_allowed' }, 403);
	if (!publishableKeyAuthorized(req)) return json(req, { error: 'invalid_api_key' }, 401);

	try {
		const admin = adminClient();
		const { data, error } = await admin.rpc('get_uppetite_community_pulse', {
			p_limit: 60,
		});

		if (error) {
			console.error('community-pulse rpc error', error);
			return json(req, { error: 'community_backend_error' }, 500);
		}

		const rows = (Array.isArray(data) ? data : []).map((row: Record<string, unknown>) => ({
			placeId: String(row.place_id ?? ''),
			zoneId: typeof row.zone_id === 'string' ? row.zone_id : null,
			visitReports30d: Number(row.visit_reports_30d ?? 0),
			accuracyConfirmations30d: Number(row.accuracy_confirmations_30d ?? 0),
			activeDays30d: Number(row.active_days_30d ?? 0),
		}));

		return json(req, {
			rows,
			updatedDaily: true,
			windowDays: 30,
			minimumDailyVisitors: 5,
		});
	} catch (error) {
		console.error('community-pulse error', error);
		return json(req, { error: 'community_backend_error' }, 500);
	}
});
