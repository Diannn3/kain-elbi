import type { AstroCookies } from 'astro';
import { createRequestSupabaseClient } from './server';
import { getVerifiedStaffIdentity, type StaffIdentity } from './authorization';

export async function getStaffContext(request: Request, cookies: AstroCookies): Promise<{
  supabase: ReturnType<typeof createRequestSupabaseClient>;
  identity?: StaffIdentity;
}> {
  const supabase = createRequestSupabaseClient({ request, cookies });
  const identity = await getVerifiedStaffIdentity(supabase);
  return { supabase, identity };
}
