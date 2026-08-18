import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function requiredServerEnv(name: 'PUBLIC_SUPABASE_URL' | 'SUPABASE_SECRET_KEY'): string {
  const value = import.meta.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for UPPETITE staff administration.`);
  return value;
}

export function createAdminSupabaseClient(): SupabaseClient {
  return createClient(
    requiredServerEnv('PUBLIC_SUPABASE_URL'),
    requiredServerEnv('SUPABASE_SECRET_KEY'),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
