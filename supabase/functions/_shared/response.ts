import { corsHeaders } from './cors.ts';

export function json(req: Request, value: unknown, status = 200): Response {
	return Response.json(value, {
		status,
		headers: {
			...corsHeaders(req),
			'Cache-Control': 'no-store',
		},
	});
}
