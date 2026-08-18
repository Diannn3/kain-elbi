import type { APIRoute } from 'astro';
import { createPublicSupabaseClient } from '../../../lib/auth/public';
import { getStaffContext } from '../../../lib/auth/guards';
import { isSameOriginMutation, setPrivateNoStore } from '../../../lib/auth/server';
import { mapEditorPickRow, parseEditorPickMutation } from '../../../lib/editor-picks';
import { loadBuildData } from '../../../lib/data/build';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, url }) => {
  const includeDrafts = url.searchParams.get('includeDrafts') === '1';
  const place = url.searchParams.get('place')?.trim();
  if (includeDrafts) {
    const { supabase, identity } = await getStaffContext(request, cookies);
    if (!identity || identity.role !== 'owner') return new Response('Forbidden', { status: 403 });
    let query = supabase.from('uppetite_editor_picks').select('*').order('sort_order').order('updated_at', { ascending:false });
    if (place) query = query.eq('place_id', place);
    const { data, error } = await query;
    const headers = new Headers({ 'Content-Type':'application/json' }); setPrivateNoStore(headers);
    if (error) return new Response(JSON.stringify({ error:'unavailable' }), { status:503, headers });
    return new Response(JSON.stringify({ picks:(data ?? []).map((row) => mapEditorPickRow(row as Record<string,unknown>)).filter(Boolean) }), { headers });
  }

  const supabase = createPublicSupabaseClient();
  if (!supabase) return new Response(JSON.stringify({ picks:[] }), { headers:{ 'Content-Type':'application/json', 'Cache-Control':'public, max-age=0, s-maxage=60, stale-while-revalidate=300' } });
  let query = supabase.from('uppetite_editor_picks').select('*').eq('published', true).order('sort_order').order('updated_at', { ascending:false });
  if (place) query = query.eq('place_id', place);
  const { data, error } = await query;
  const headers = new Headers({ 'Content-Type':'application/json', 'Cache-Control':'public, max-age=0, s-maxage=60, stale-while-revalidate=300' });
  if (error) return new Response(JSON.stringify({ picks:[] }), { status:200, headers });
  return new Response(JSON.stringify({ picks:(data ?? []).map((row) => mapEditorPickRow(row as Record<string,unknown>)).filter(Boolean) }), { headers });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isSameOriginMutation(request)) return new Response('Forbidden', { status:403 });
  const { supabase, identity } = await getStaffContext(request, cookies);
  if (!identity || identity.role !== 'owner') return new Response('Forbidden', { status:403 });
  const payload = parseEditorPickMutation(await request.json().catch(() => undefined));
  if (!payload) return new Response('Invalid editor pick', { status:400 });
  const { places } = await loadBuildData();
  if (!places.some((place) => place.id === payload.placeId && place.recordStatus === 'candidate')) return new Response('Unknown place', { status:400 });
  const { data: current } = await supabase.from('uppetite_editor_picks').select('sort_order').order('sort_order', { ascending:false }).limit(1).maybeSingle();
  const { data, error } = await supabase.from('uppetite_editor_picks').insert({
    place_id:payload.placeId,
    tagline:payload.tagline,
    editor_note:payload.editorNote,
    reason_tags:payload.reasonTags,
    published:payload.published,
    sort_order:Math.max(0, Number(current?.sort_order ?? -1) + 1),
  }).select('*').single();
  const headers = new Headers({ 'Content-Type':'application/json' }); setPrivateNoStore(headers);
  if (error) return new Response(JSON.stringify({ error:error.code === '23505' ? 'already-exists' : 'save-failed' }), { status:error.code === '23505' ? 409 : 500, headers });
  return new Response(JSON.stringify({ pick:mapEditorPickRow(data as Record<string,unknown>) }), { status:201, headers });
};
