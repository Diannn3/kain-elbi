import type { APIRoute } from 'astro';
import { canEditPlaces } from '../../../../lib/auth/authorization';
import { getStaffContext } from '../../../../lib/auth/guards';
import { isSameOriginMutation, setPrivateNoStore } from '../../../../lib/auth/server';

export const prerender = false;
export const POST: APIRoute = async ({ request, cookies, params }) => {
  if (!isSameOriginMutation(request)) return new Response('Forbidden', { status:403 });
  const { supabase, identity } = await getStaffContext(request, cookies);
  if (!identity || !canEditPlaces(identity.role)) return new Response('Forbidden', { status:403 });
  const id = params.id ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Invalid feedback id', { status:400 });
  const raw = await request.json().catch(() => undefined) as { status?:unknown; reason?:unknown } | undefined;
  const status = typeof raw?.status === 'string' ? raw.status : '';
  const reason = typeof raw?.reason === 'string' ? raw.reason.trim().slice(0,500) : null;
  if (!['open','reviewing','resolved','dismissed'].includes(status)) return new Response('Invalid status', { status:400 });
  const { data, error } = await supabase.rpc('set_uppetite_place_feedback_status', { p_feedback_id:id, p_status:status, p_reason:reason });
  const headers = new Headers({ 'Content-Type':'application/json' }); setPrivateNoStore(headers);
  if (error || data !== true) return new Response(JSON.stringify({ error:'update-failed' }), { status:500, headers });
  return new Response(JSON.stringify({ ok:true }), { headers });
};
