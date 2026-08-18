import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';

function requiredPublicEnv(name: 'PUBLIC_SUPABASE_URL' | 'PUBLIC_SUPABASE_PUBLISHABLE_KEY'): string {
  const value = import.meta.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for authenticated UPPETITE routes.`);
  return value;
}

export function createRequestSupabaseClient({ request, cookies }: { request: Request; cookies: AstroCookies }): SupabaseClient {
  return createServerClient(
    requiredPublicEnv('PUBLIC_SUPABASE_URL'),
    requiredPublicEnv('PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get('Cookie') ?? '');
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookies.set(name, value, options));
        },
      },
    },
  );
}

export function setPrivateNoStore(headers: Headers): void {
  headers.set('Cache-Control', 'private, no-store');
  headers.set('CDN-Cache-Control', 'no-store');
  headers.set('Vercel-CDN-Cache-Control', 'no-store');
}

export function isSameOriginMutation(request: Request): boolean {
  const fetchSite = request.headers.get('Sec-Fetch-Site');
  if (fetchSite === 'cross-site') return false;
  const origin = request.headers.get('Origin');
  if (!origin) {
    // Some non-browser/test clients omit Origin. They still need the authenticated
    // cookie to succeed, while modern cross-site browser POSTs are rejected above.
    return fetchSite !== 'cross-site';
  }
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

export function safeLocalNext(value: string | null | undefined, fallback = '/places-ops'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
  try {
    const parsed = new URL(value, 'https://uppetite.local');
    return parsed.origin === 'https://uppetite.local' ? parsed.pathname + parsed.search + parsed.hash : fallback;
  } catch {
    return fallback;
  }
}
