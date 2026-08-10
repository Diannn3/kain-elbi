export function corsHeaders(req: Request): Record<string, string> {
	const origin = req.headers.get('origin') ?? '';
	const configured = (Deno.env.get('UPPETITE_ALLOWED_ORIGINS') ?? 'http://localhost:4321,http://127.0.0.1:4321')
		.split(',')
		.map((value) => value.trim())
		.filter(Boolean);

	const allowAll = configured.includes('*');
	const allowed = allowAll || !origin || configured.includes(origin);

	return {
		'Access-Control-Allow-Origin': allowAll ? '*' : (allowed ? origin : 'null'),
		'Access-Control-Allow-Headers': 'apikey, content-type',
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Vary': 'Origin',
	};
}

export function originAllowed(req: Request): boolean {
	const origin = req.headers.get('origin');
	if (!origin) return true;
	const configured = (Deno.env.get('UPPETITE_ALLOWED_ORIGINS') ?? 'http://localhost:4321,http://127.0.0.1:4321')
		.split(',')
		.map((value) => value.trim())
		.filter(Boolean);
	return configured.includes('*') || configured.includes(origin);
}
