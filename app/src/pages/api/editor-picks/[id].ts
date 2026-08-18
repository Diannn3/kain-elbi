import type { APIRoute } from 'astro';
import { getStaffContext } from '../../../lib/auth/guards';
import { isSameOriginMutation, setPrivateNoStore } from '../../../lib/auth/server';
import { mapEditorPickRow, parseEditorPickMutation } from '../../../lib/editor-picks';
import { loadBuildData } from '../../../lib/data/build';

export const prerender = false;

export const PATCH: APIRoute = async ({ request, cookies, params }) => {
  if (!isSameOriginMutation(request)) return new Response('Forbidden', { status:403 });
  const { supabase, identity } = await getStaffContext(request, cookies);
  if (!identity || identity.role !== 'owner') return new Response('Forbidden', { status:403 });
  const id = params.id ?? '';
  const payload = parseEditorPickMutation(await request.json().catch(() => undefined));
  if (!/^[0-9a-f-]{36}$/i.test(id) || !payload) return new Response('Invalid editor pick', { status:400 });
  const { places } = await loadBuildData();
  if (!places.some((place) => place.id === payload.placeId && place.recordStatus === 'candidate')) return new Response('Unknown place', { status:400 });
  const { data, error } = await supabase.from('uppetite_editor_picks').update({
    place_id:payload.placeId, tagline:payload.tagline, editor_note:payload.editorNote,
    reason_tags:payload.reasonTags, published:payload.published,
  }).eq('id', id).select('*').single();
  const headers = new Headers({ 'Content-Type':'application/json' }); setPrivateNoStore(headers);
  if (error) return new Response(JSON.stringify({ error:'save-failed' }), { status:500, headers });
  return new Response(JSON.stringify({ pick:mapEditorPickRow(data as Record<string,unknown>) }), { headers });
};

export const DELETE: APIRoute = async ({ request, cookies, params }) => {
  if (!isSameOriginMutation(request)) return new Response('Forbidden', { status:403 });
  const { supabase, identity } = await getStaffContext(request, cookies);
  if (!identity || identity.role !== 'owner') return new Response('Forbidden', { status:403 });
  const id = params.id ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Invalid id', { status:400 });
  const { error } = await supabase.from('uppetite_editor_picks').delete().eq('id', id);
  const headers = new Headers(); setPrivateNoStore(headers);
  return error ? new Response('Delete failed', { status:500, headers }) : new Response(null, { status:204, headers });
};
