import type { APIRoute } from 'astro';
import { createRequestSupabaseClient, isSameOriginMutation, setPrivateNoStore } from '../../../lib/auth/server';

export const prerender = false;
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  if (!isSameOriginMutation(request)) return new Response('Forbidden', { status: 403 });
  const supabase = createRequestSupabaseClient({ request, cookies });
  await supabase.auth.signOut();
  const response = redirect('/', 303);
  setPrivateNoStore(response.headers);
  return response;
};
