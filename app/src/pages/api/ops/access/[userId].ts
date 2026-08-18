import type { APIRoute } from 'astro';
import { getStaffContext } from '../../../../lib/auth/guards';
import { isSameOriginMutation, setPrivateNoStore } from '../../../../lib/auth/server';

export const prerender = false;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const POST: APIRoute = async ({ request, cookies, params, redirect }) => {
  if (!isSameOriginMutation(request)) return new Response('Forbidden', { status: 403 });
  const { supabase, identity } = await getStaffContext(request, cookies);
  if (!identity || identity.role !== 'owner') return new Response('Forbidden', { status: 403 });
  const userId = params.userId ?? '';
  if (!UUID.test(userId) || userId === identity.userId) return new Response('Invalid target', { status: 400 });
  const form = await request.formData();
  const action = String(form.get('action') ?? '');

  let role: 'places_editor' | 'places_viewer';
  let active: boolean;
  if (action === 'revoke') {
    const { data: existing, error } = await supabase.from('uppetite_staff_members').select('role').eq('user_id', userId).maybeSingle();
    if (error || !existing || !['places_editor','places_viewer'].includes(existing.role)) return new Response('Protected membership', { status: 400 });
    role = existing.role as typeof role;
    active = false;
  } else if (action === 'role') {
    const requested = String(form.get('role') ?? '');
    if (!['places_editor','places_viewer'].includes(requested)) return new Response('Invalid role', { status: 400 });
    role = requested as typeof role;
    active = true;
  } else {
    return new Response('Invalid action', { status: 400 });
  }

  const { error } = await supabase.rpc('set_uppetite_staff_access', {
    p_target_user_id: userId,
    p_role: role,
    p_active: active,
  });
  if (error) return new Response('Could not update access', { status: error.code === '42501' ? 403 : 500 });

  const response = redirect('/places-ops/access?ok=updated', 303);
  setPrivateNoStore(response.headers);
  return response;
};
