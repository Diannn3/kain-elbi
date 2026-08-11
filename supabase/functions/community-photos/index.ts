import { adminClient } from '../_shared/admin.ts';
import { publishableKeyAuthorized } from '../_shared/auth.ts';
import { corsHeaders, originAllowed } from '../_shared/cors.ts';
import { json } from '../_shared/response.ts';

const PLACE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const SIGNED_URL_SECONDS = 10 * 60;

Deno.serve(async (req) => {
	if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) });
	if (req.method !== 'GET') return json(req, { error: 'method_not_allowed' }, 405);
	if (!originAllowed(req)) return json(req, { error: 'origin_not_allowed' }, 403);
	if (!publishableKeyAuthorized(req)) return json(req, { error: 'invalid_api_key' }, 401);

	const placeId = new URL(req.url).searchParams.get('placeId')?.trim() ?? '';
	if (!PLACE_ID.test(placeId)) return json(req, { error: 'invalid_place_id' }, 400);

	const admin = adminClient();
	const { data, error } = await admin
		.from('uppetite_community_place_photos')
		.select('storage_path')
		.eq('place_id', placeId)
		.eq('status', 'approved')
		.not('contributor_terms_version', 'is', null)
		.not('license_accepted_at', 'is', null)
		.order('created_at', { ascending: false })
		.limit(24);

	if (error) {
		console.error('Approved photo lookup failed', error);
		return json(req, { error: 'community_backend_error' }, 500);
	}

	const urls: string[] = [];
	for (const row of data ?? []) {
		const { data: signed, error: signError } = await admin.storage
			.from('place-photos')
			.createSignedUrl(row.storage_path, SIGNED_URL_SECONDS);
		if (signError) {
			console.error('Signed photo URL failed', signError);
			continue;
		}
		if (signed?.signedUrl) urls.push(signed.signedUrl);
	}

	return json(req, { urls, expiresInSeconds: SIGNED_URL_SECONDS });
});
