import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function pngSize(path: string) {
	const bytes = readFileSync(resolve(path));
	expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
	return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe('PWA manifest', () => {
	it('declares a stable app identity and Chromium-sized install icons', () => {
		const manifest = JSON.parse(readFileSync(resolve('public/manifest.webmanifest'), 'utf8'));
		expect(manifest.id).toBe('/');
		expect(manifest.scope).toBe('/');
		expect(manifest.start_url).toBe('/');
		expect(manifest.icons).toEqual(expect.arrayContaining([
			expect.objectContaining({ src: '/icons/uppetite-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }),
			expect.objectContaining({ src: '/icons/uppetite-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }),
			expect.objectContaining({ src: '/icons/uppetite-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }),
		]));
		expect(pngSize('public/icons/uppetite-192.png')).toEqual({ width: 192, height: 192 });
		expect(pngSize('public/icons/uppetite-512.png')).toEqual({ width: 512, height: 512 });
		expect(pngSize('public/icons/uppetite-maskable-512.png')).toEqual({ width: 512, height: 512 });
	});
});
