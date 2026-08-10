import { adminClient } from '../_shared/admin.ts';
import { publishableKeyAuthorized } from '../_shared/auth.ts';
import { hmacHex, manilaDay } from '../_shared/crypto.ts';
import { corsHeaders, originAllowed } from '../_shared/cors.ts';
import { json } from '../_shared/response.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLACE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const DAILY_UPLOAD_LIMIT = 3;

async function isSafeWebp(file: File): Promise<boolean> {
	if (file.type !== 'image/webp' || file.size < 20) return false;
	const bytes = new Uint8Array(await file.arrayBuffer());
	const ascii = (offset: number, length: number) => String.fromCharCode(...bytes.slice(offset, offset + length));
	if (ascii(0, 4) !== 'RIFF' || ascii(8, 4) !== 'WEBP') return false;

	// RIFF's size field describes the remaining bytes after the first 8 bytes.
	const riffSize = bytes[4] | (bytes[5] << 8) | (bytes[6] << 16) | (bytes[7] << 24);
	if ((riffSize >>> 0) + 8 !== bytes.length) return false;

	// Canvas-generated WebP should contain image payload only. Explicitly reject
	// standardized EXIF/XMP chunks so a crafted caller cannot bypass the client's
	// metadata-stripping canvas by posting a hand-built WebP directly.
	let offset = 12;
	for (; offset + 8 <= bytes.length;) {
		const chunk = ascii(offset, 4);
		const chunkSize = (
			bytes[offset + 4]
			| (bytes[offset + 5] << 8)
			| (bytes[offset + 6] << 16)
			| (bytes[offset + 7] << 24)
		) >>> 0;
		const next = offset + 8 + chunkSize + (chunkSize % 2);
		if (next > bytes.length) return false;
		if (chunk === 'EXIF' || chunk === 'XMP ') return false;
		offset = next;
	}
	return offset === bytes.length;
}

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
		if (!(file instanceof File) || file.size <= 0 || file.size > MAX_FILE_BYTES) {
			return json(req, { error: file instanceof File && file.size > MAX_FILE_BYTES ? 'file_too_large' : 'invalid_file' }, 400);
		}
		// The client re-encodes selected images to WebP to strip metadata. Do
		// not trust caller-controlled filename extensions or MIME strings alone.
		if (!(await isSafeWebp(file))) return json(req, { error: 'invalid_file_type' }, 400);

		const secret = Deno.env.get('UPPETITE_HMAC_SECRET');
		if (!secret || secret.length < 32) return json(req, { error: 'server_configuration_error' }, 500);

		const normalizedInstallId = installId.trim();
		const normalizedPlaceId = placeId.trim();
		const installIdHash = await hmacHex(secret, `uppetite:v1:install:${normalizedInstallId}`);
		const day = manilaDay();
		const admin = adminClient();

		// Validate the place before consuming a daily upload slot.
		const { data: placeData, error: placeError } = await admin
			.from('uppetite_community_place_registry')
			.select('place_id')
			.eq('place_id', normalizedPlaceId)
			.eq('active', true)
			.maybeSingle();
		if (placeError) {
			console.error('Place lookup error', placeError);
			return json(req, { error: 'community_backend_error' }, 500);
		}
		if (!placeData) return json(req, { error: 'unknown_place' }, 404);

		// One atomic database statement claims a Manila-calendar-day slot.
		// This closes the race where concurrent requests could both pass a
		// separate COUNT query before either insert became visible.
		const { data: slotClaimed, error: slotError } = await admin.rpc('uppetite_claim_photo_upload_slot', {
			p_day: day,
			p_installation_id_hash: installIdHash,
			p_limit: DAILY_UPLOAD_LIMIT,
		});
		if (slotError) {
			console.error('Photo rate-limit claim error', slotError);
			return json(req, { error: 'community_backend_error' }, 500);
		}
		if (!slotClaimed) return json(req, { error: 'rate_limited' }, 429);

		const fileId = crypto.randomUUID();
		const storagePath = `${normalizedPlaceId}/${fileId}.webp`;
		const { error: uploadError } = await admin.storage
			.from('place-photos')
			.upload(storagePath, file, {
				contentType: 'image/webp',
				upsert: false,
			});
		if (uploadError) {
			console.error('Upload error', uploadError);
			return json(req, { error: 'upload_failed' }, 500);
		}

		const { error: dbError } = await admin
			.from('uppetite_community_place_photos')
			.insert({
				place_id: normalizedPlaceId,
				storage_path: storagePath,
				installation_id_hash: installIdHash,
				status: 'pending',
			});
		if (dbError) {
			console.error('DB insert error', dbError);
			// Storage and Postgres are separate systems. Compensate immediately
			// when the metadata write fails so moderation does not accumulate
			// unreachable orphan objects.
			const { error: cleanupError } = await admin.storage.from('place-photos').remove([storagePath]);
			if (cleanupError) console.error('Orphan cleanup error', cleanupError);
			return json(req, { error: 'community_backend_error' }, 500);
		}

		return json(req, { success: true, status: 'pending' });
	} catch (error) {
		console.error('photo-upload error', error);
		return json(req, { error: 'community_backend_error' }, 500);
	}
});
