import type { APIRoute } from 'astro';
import { getStaffContext } from '../../../lib/auth/guards';
import { isSameOriginMutation, setPrivateNoStore } from '../../../lib/auth/server';

export const prerender = false;
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isSameOriginMutation(request)) return new Response('Forbidden', { status:403 });
  const { supabase, identity } = await getStaffContext(request, cookies);
  if (!identity || identity.role !== 'owner') return new Response('Forbidden', { status:403 });
  const raw = await request.json().catch(() => undefined) as { ids?: unknown } | undefined;
  const submitted = Array.isArray(raw?.ids) ? raw.ids : [];
  const ids = submitted.filter((id): id is string => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));
  if (!ids.length || ids.length !== submitted.length || ids.length !== new Set(ids).size) return new Response('Invalid order', { status:400 });
  const { error } = await supabase.rpc('reorder_uppetite_editor_picks', { p_ids:ids });
  const headers = new Headers(); setPrivateNoStore(headers);
  return error ? new Response('Reorder failed', { status:500, headers }) : new Response(null, { status:204, headers });
};
