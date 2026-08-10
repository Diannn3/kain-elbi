import { createClient } from 'npm:@supabase/supabase-js@^2.95.0';
import { defaultSecretKey } from './auth.ts';

export function adminClient() {
	const url = Deno.env.get('SUPABASE_URL');
	if (!url) throw new Error('SUPABASE_URL is missing.');

	return createClient(url, defaultSecretKey(), {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
			detectSessionInUrl: false,
		},
	});
}
