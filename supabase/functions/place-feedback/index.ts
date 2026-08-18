import { adminClient } from '../_shared/admin.ts';
import { publishableKeyAuthorized } from '../_shared/auth.ts';
import { communityTokens, manilaDay } from '../_shared/crypto.ts';
import { corsHeaders, originAllowed } from '../_shared/cors.ts';
import { json } from '../_shared/response.ts';

const CATEGORIES = new Set(['hours_wrong', 'price_menu_wrong', 'location_wrong', 'closed', 'duplicate', 'other']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const PLACE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405);
  if (!originAllowed(req)) return json(req, { error: 'origin_not_allowed' }, 403);
  if (!publishableKeyAuthorized(req)) return json(req, { error: 'invalid_api_key' }, 401);
  let body: unknown;
  try { body = await req.json(); } catch { return json(req, { error: 'invalid_json' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json(req, { error: 'invalid_payload' }, 400);
  const input = body as Record<string, unknown>;
  const placeId = typeof input.placeId === 'string' ? input.placeId.trim() : '';
  const category = typeof input.category === 'string' ? input.category : '';
  const installId = typeof input.installId === 'string' ? input.installId.trim() : '';
  if (!PLACE_ID.test(placeId)) return json(req, { error: 'invalid_place_id' }, 400);
  if (!CATEGORIES.has(category)) return json(req, { error: 'invalid_category' }, 400);
  if (!UUID.test(installId)) return json(req, { error: 'invalid_installation_id' }, 400);

  try {
    const day = manilaDay();
    const { dedupeToken, dailyInstallToken } = await communityTokens({ eventType: `feedback:${category}`, installId, placeId, day });
    const admin = adminClient();
    const { data, error } = await admin.rpc('record_uppetite_place_feedback', {
      p_category: category,
      p_place_id: placeId,
      p_event_day: day,
      p_dedupe_token: dedupeToken,
      p_daily_install_token: dailyInstallToken,
    });
    if (error) {
      if (error.message.includes('rate_limited')) return json(req, { error: 'rate_limited' }, 429);
      if (error.message.includes('unknown_place')) return json(req, { error: 'unknown_place' }, 404);
      console.error('place-feedback rpc error', error);
      return json(req, { error: 'community_backend_error' }, 500);
    }
    const result = data as { accepted?: boolean; duplicate?: boolean } | null;
    return json(req, { accepted: Boolean(result?.accepted), duplicate: Boolean(result?.duplicate) });
  } catch (error) {
    console.error('place-feedback error', error);
    return json(req, { error: 'community_backend_error' }, 500);
  }
});
