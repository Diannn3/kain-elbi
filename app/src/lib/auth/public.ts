import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function createPublicSupabaseClient(): SupabaseClient | undefined {
  const url = import.meta.env.PUBLIC_SUPABASE_URL?.trim();
  const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return undefined;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
