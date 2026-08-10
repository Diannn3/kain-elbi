const encoder = new TextEncoder();

export async function hmacHex(secret: string, value: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
	return [...new Uint8Array(signature)]
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

export function manilaDay(now = new Date()): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Manila',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(now);
	const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
	return `${value.year}-${value.month}-${value.day}`;
}

export async function communityTokens(input: {
	eventType: string;
	installId: string;
	placeId: string;
	day: string;
}) {
	const secret = Deno.env.get('UPPETITE_HMAC_SECRET');
	if (!secret || secret.length < 32) {
		throw new Error('UPPETITE_HMAC_SECRET must be configured with at least 32 characters.');
	}

	const dedupeToken = await hmacHex(
		secret,
		`uppetite:v1:event:${input.eventType}:${input.installId}:${input.placeId}:${input.day}`,
	);
	const dailyInstallToken = await hmacHex(
		secret,
		`uppetite:v1:daily:${input.installId}:${input.day}`,
	);

	return { dedupeToken, dailyInstallToken };
}
