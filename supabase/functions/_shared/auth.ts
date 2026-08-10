function dictionary(raw: string | undefined): Record<string, string> {
	if (!raw) return {};
	try {
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
		return Object.fromEntries(
			Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
		);
	} catch {
		return {};
	}
}

export function publishableKeyAuthorized(req: Request): boolean {
	const provided = req.headers.get('apikey')?.trim();
	if (!provided) return false;

	const current = Object.values(dictionary(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')));
	const legacy = Deno.env.get('SUPABASE_ANON_KEY');
	if (legacy) current.push(legacy);

	return current.some((key) => key === provided);
}

export function defaultSecretKey(): string {
	const current = dictionary(Deno.env.get('SUPABASE_SECRET_KEYS'));
	if (current.default) return current.default;

	const first = Object.values(current)[0];
	if (first) return first;

	const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
	if (legacy) return legacy;

	throw new Error('Supabase secret key is not available in the Edge Function environment.');
}
