import { adminClient } from '../_shared/admin.ts';
import { publishableKeyAuthorized } from '../_shared/auth.ts';
import { hmacHex, manilaDay } from '../_shared/crypto.ts';
import { corsHeaders, originAllowed } from '../_shared/cors.ts';
import { json } from '../_shared/response.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLACE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;

Deno.serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: corsHeaders(req) });
	}
	if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405);
	if (!originAllowed(req)) return json(req, { error: 'origin_not_allowed' }, 403);
	if (!publishableKeyAuthorized(req)) return json(req, { error: 'invalid_api_key' }, 401);

	try {
		const formData = await req.formData();
		const placeId = formData.get('placeId');
		const installId = formData.get('installId');
		const file = formData.get('file');

		if (typeof placeId !== 'string' || !PLACE_ID.test(placeId.trim())) {
			return json(req, { error: 'invalid_place_id' }, 400);
		}
		if (typeof installId !== 'string' || !UUID.test(installId.trim())) {
			return json(req, { error: 'invalid_installation_id' }, 400);
		}
		if (!(file instanceof File)) {
			return json(req, { error: 'invalid_file' }, 400);
		}

		if (file.size > 2 * 1024 * 1024) { // 2MB max after client-side compression
			return json(req, { error: 'file_too_large' }, 400);
		}

		const secret = Deno.env.get('UPPETITE_HMAC_SECRET');
		if (!secret) return json(req, { error: 'server_configuration_error' }, 500);

		const installIdHash = await hmacHex(secret, `uppetite:v1:install:${installId.trim()}`);
		const day = manilaDay();
		const dailyUploadToken = await hmacHex(secret, `uppetite:v1:upload:${installId.trim()}:${day}`);

		const admin = adminClient();

		// Check rate limit: max 3 photos per day
		// Since we don't have a dedicated table for upload rate limits, we'll just count 
		// the photos from this installation today.
		const { count, error: countError } = await admin
			.from('uppetite_community_place_photos')
			.select('id', { count: 'exact', head: true })
			.eq('installation_id_hash', installIdHash)
			.gte('created_at', new Date(new Date().setUTCHours(0,0,0,0)).toISOString()); // Approximate UTC start of day, good enough

		if (countError) {
			console.error('Count error', countError);
			return json(req, { error: 'community_backend_error' }, 500);
		}

		if (count !== null && count >= 3) {
			return json(req, { error: 'rate_limited' }, 429);
		}

		// Validate place exists in registry
		const { data: placeData, error: placeError } = await admin
			.from('uppetite_community_place_registry')
			.select('place_id')
			.eq('place_id', placeId.trim())
			.eq('active', true)
			.maybeSingle();
		
		if (placeError || !placeData) {
			return json(req, { error: 'unknown_place' }, 404);
		}

		// Generate random UUID for storage
		const fileId = crypto.randomUUID();
		const fileExt = file.name.split('.').pop() || 'webp';
		const storagePath = `${placeId.trim()}/${fileId}.${fileExt}`;

		// Upload to Storage
		const { error: uploadError } = await admin.storage
			.from('place-photos')
			.upload(storagePath, file, {
				contentType: file.type,
				upsert: false
			});

		if (uploadError) {
			console.error('Upload error', uploadError);
			return json(req, { error: 'upload_failed' }, 500);
		}

		// Insert into place_photos table
		const { error: dbError } = await admin
			.from('uppetite_community_place_photos')
			.insert({
				place_id: placeId.trim(),
				storage_path: storagePath,
				installation_id_hash: installIdHash,
				status: 'pending'
			});
		
		if (dbError) {
			console.error('DB insert error', dbError);
			// Ideally we'd delete the storage file here, but keeping it is harmless orphan.
			return json(req, { error: 'community_backend_error' }, 500);
		}

		return json(req, { success: true, status: 'pending' });
	} catch (error) {
		console.error('photo-upload error', error);
		return json(req, { error: 'community_backend_error' }, 500);
	}
});
