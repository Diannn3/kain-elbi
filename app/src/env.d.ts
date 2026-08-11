/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly PUBLIC_SUPABASE_URL?: string;
	readonly PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
	readonly PUBLIC_GA_MEASUREMENT_ID?: string;
	readonly PUBLIC_PRIVACY_CONTROLLER_NAME?: string;
	readonly PUBLIC_PRIVACY_CONTACT_EMAIL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
