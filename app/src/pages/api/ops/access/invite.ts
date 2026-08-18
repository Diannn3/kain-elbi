import type { APIRoute } from 'astro';
import { createAdminSupabaseClient } from '../../../../lib/auth/admin';
import { getStaffContext } from '../../../../lib/auth/guards';
import { isSameOriginMutation, setPrivateNoStore } from '../../../../lib/auth/server';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  if (!isSameOriginMutation(request)) return new Response('Forbidden', { status: 403 });
  const { identity } = await getStaffContext(request, cookies);
  if (!identity || identity.role !== 'owner') return new Response('Forbidden', { status: 403 });
  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const role = String(form.get('role') ?? '');
  if (!/^\S+@\S+\.\S+$/.test(email) || !['places_editor','places_viewer'].includes(role)) {
    return new Response('Invalid invite', { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const redirectTo = `${url.origin}/auth/callback`;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (error || !data.user) {
    const response = redirect('/places-ops/access?error=invite-failed', 303);
    setPrivateNoStore(response.headers);
    return response;
  }

  const { error: registrationError } = await admin.rpc('register_uppetite_staff_invite', {
    p_target_user_id: data.user.id,
    p_role: role,
    p_actor_user_id: identity.userId,
  });
  if (registrationError) {
    // Do not leave a usable invited Auth account with no corresponding staff record.
    await admin.auth.admin.deleteUser(data.user.id).catch(() => undefined);
    return new Response('Invite could not be registered. Check Supabase.', { status: 500 });
  }

  const response = redirect('/places-ops/access?ok=invited', 303);
  setPrivateNoStore(response.headers);
  return response;
};
