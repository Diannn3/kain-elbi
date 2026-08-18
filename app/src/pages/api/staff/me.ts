import type { APIRoute } from 'astro';
import { createRequestSupabaseClient, setPrivateNoStore } from '../../../lib/auth/server';
import { getVerifiedStaffIdentity } from '../../../lib/auth/authorization';

export const prerender = false;
export const GET: APIRoute = async ({ request, cookies }) => {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  setPrivateNoStore(headers);
  try {
    const supabase = createRequestSupabaseClient({ request, cookies });
    const staff = await getVerifiedStaffIdentity(supabase);
    return new Response(JSON.stringify(staff
      ? { authenticated: true, staff: true, role: staff.role }
      : { authenticated: false, staff: false }), { status: 200, headers });
  } catch {
    return new Response(JSON.stringify({ authenticated: false, staff: false }), { status: 200, headers });
  }
};
