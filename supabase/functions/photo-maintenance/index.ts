import { adminClient } from '../_shared/admin.ts';

const BATCH_SIZE = 100;

Deno.serve(async (req) => {
	if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 });

	const expected = Deno.env.get('UPPETITE_MAINTENANCE_SECRET')?.trim() ?? '';
	const supplied = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ?? '';
	if (!expected || supplied !== expected) return new Response('unauthorized', { status: 401 });

	const admin = adminClient();
	const now = new Date().toISOString();

	const { data: stalePhotos, error: staleError } = await admin
		.from('uppetite_community_place_photos')
		.select('id,storage_path')
		.lte('expires_at', now)
		.limit(BATCH_SIZE);

	if (staleError) {
		console.error('Retention lookup failed', staleError);
		return new Response('retention_lookup_failed', { status: 500 });
	}

	const paths = (stalePhotos ?? []).map((row) => row.storage_path);
	if (paths.length) {
		const { error: storageError } = await admin.storage.from('place-photos').remove(paths);
		if (storageError) {
			console.error('Retention storage cleanup failed', storageError);
			return new Response('storage_cleanup_failed', { status: 500 });
		}

		const ids = (stalePhotos ?? []).map((row) => row.id);
		const { error: rowError } = await admin
			.from('uppetite_community_place_photos')
			.delete()
			.in('id', ids);
		if (rowError) {
			console.error('Retention row cleanup failed', rowError);
			return new Response('row_cleanup_failed', { status: 500 });
		}
	}

	const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
	const { error: limitError } = await admin
		.from('uppetite_community_photo_upload_limits')
		.delete()
		.lt('day', cutoff);
	if (limitError) console.error('Photo rate-limit cleanup failed', limitError);

	return Response.json({ deletedPhotos: paths.length });
});
