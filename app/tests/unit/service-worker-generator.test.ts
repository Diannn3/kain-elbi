import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
	SERVICE_WORKER_SCHEMA_VERSION,
	buildPrecacheManifest,
	generateServiceWorker,
	hashDistContents,
} from '../../scripts/generate-service-worker.mjs';
import { PWA_CLIENT_BOOTSTRAP_VERSION } from '../../src/lib/pwa-update.mjs';

const temporaryDirectories: string[] = [];

async function put(root: string, path: string, contents: string | Uint8Array = path) {
	const target = join(root, ...path.split('/'));
	await mkdir(join(target, '..'), { recursive: true });
	await writeFile(target, contents);
}

async function createFixture() {
	const root = await mkdtemp(join(tmpdir(), 'uppetite-sw-'));
	temporaryDirectories.push(root);
	await put(root, 'index.html', '<link rel="stylesheet" href="/_astro/Layout.abc.css"><astro-island component-url="/_astro/RoutePlanner.abc.js" renderer-url="/_astro/client.svelte.abc.js"></astro-island>');
	await put(root, 'offline/index.html', '<link rel="stylesheet" href="/_astro/Layout.abc.css">');
	await put(root, 'manifest.webmanifest', '{}');
	await put(root, 'favicon.svg', '<svg></svg>');
	await put(root, 'favicon.ico', 'ico');
	await put(root, 'icons/uppetite-192.png', 'png192');
	await put(root, 'icons/uppetite-512.png', 'png512');
	await put(root, 'icons/uppetite-maskable-512.png', 'mask');
	await put(root, '_astro/Layout.abc.css', 'body{}');
	await put(root, '_astro/RoutePlanner.abc.js', "import{client}from'./client.abc.js'; import('./MapExperience.abc.js'); import('./opening_hours.abc.js');");
	await put(root, '_astro/client.svelte.abc.js', 'export const renderer = true;');
	await put(root, '_astro/client.abc.js', 'export const client = true;');
	await put(root, '_astro/maplibre-gl.abc.js', 'heavy map');
	await put(root, '_astro/MapExperience.abc.js', 'heavy experience');
	await put(root, '_astro/opening_hours.abc.js', 'heavy hours');
	await put(root, '_astro/PlaceSheet.abc.js', 'sheet');
	await put(root, '_astro/sora-latin-wght-normal.abc.woff2', 'font-a');
	await put(root, '_astro/inter-latin-wght-normal.abc.woff2', 'font-b');
	await put(root, '_astro/sora-latin-ext-wght-normal.abc.woff2', 'font-ext');
	await put(root, 'place/one/index.html', '<h1>Place</h1>');
	await put(root, 'data/route_matrix.json', '{}');
	await put(root, 'data/runtime-manifest.json', '{}');
	await put(root, 'data/releases/0123456789ab/places.json', '[]');
	return root;
}

afterEach(async () => {
	await Promise.all(
		temporaryDirectories
			.splice(0)
			.map((path) => rm(path, { recursive: true, force: true })),
	);
});

describe('service worker generator', () => {
	it('uses the explicit release-gate-v3 lifecycle schema', () => {
		expect(SERVICE_WORKER_SCHEMA_VERSION).toBe('release-gate-v3');
	});

	it('changes version when equal-length file contents change', async () => {
		const root = await createFixture();
		const first = await hashDistContents(root);
		await put(root, '_astro/client.abc.js', 'export const client = fals');
		const second = await hashDistContents(root);
		expect(second).not.toBe(first);
	});

	it('preloads only the shell static graph, Latin fonts, and install icons', async () => {
		const root = await createFixture();
		const manifest = await buildPrecacheManifest(root);

		expect(manifest).toEqual(expect.arrayContaining([
			'/index.html',
			'/offline/index.html',
			'/manifest.webmanifest',
			'/icons/uppetite-192.png',
			'/_astro/Layout.abc.css',
			'/_astro/RoutePlanner.abc.js',
			'/_astro/client.abc.js',
			'/_astro/sora-latin-wght-normal.abc.woff2',
			'/_astro/inter-latin-wght-normal.abc.woff2',
		]));
		expect(manifest.join('\n')).not.toMatch(
			/place\/one|route_matrix|runtime-manifest|data\/releases|maplibre|MapExperience|opening_hours|PlaceSheet|latin-ext/,
		);
		expect(manifest).toEqual([...manifest].sort());
	});

	it('generates the automatic legacy-client upgrade lifecycle', async () => {
		const root = await createFixture();
		await generateServiceWorker(root);

		const source = await readFile(join(root, 'sw.js'), 'utf8');

		expect(source).toContain(
			`const CLIENT_BOOTSTRAP_VERSION = ${PWA_CLIENT_BOOTSTRAP_VERSION};`,
		);
		expect(source).toContain('UPPETITE_CLIENT_VERSION_PROBE');
		expect(source).toContain('UPPETITE_CLIENT_VERSION');
		expect(source).toContain("type: 'window'");
		expect(source).toContain('includeUncontrolled: true');
		expect(source).toContain('client.navigate(client.url)');
		expect(source).toContain('self.skipWaiting()');
		expect(source).toContain('self.clients.claim()');
		expect(source).toContain("fetch(request, { cache: 'no-store' })");
	});

	it('uses network-first manifest and cache-first immutable release data', async () => {
		const root = await createFixture();
		await generateServiceWorker(root);

		const source = await readFile(join(root, 'sw.js'), 'utf8');
		expect(source).toContain("url.pathname === '/data/runtime-manifest.json'");
		expect(source).toContain("url.pathname.startsWith('/data/releases/')");
		expect(source).toContain('latestDataManifest(event.request)');
		expect(source).toContain('immutableData(event.request)');
		expect(source).toContain("new Response(\n      JSON.stringify({ error: 'offline' })");
	});

	it('keeps one previous static and data cache generation during migration', async () => {
		const root = await createFixture();
		await generateServiceWorker(root);

		const source = await readFile(join(root, 'sw.js'), 'utf8');

		expect(source).toContain('previousStaticCaches');
		expect(source).toContain('previousDataCaches');
		expect(source).toContain('.slice(-1)');
		expect(source).toContain('kain-elbi-static-');
		expect(source).toContain('uppetite-static-');
		expect(source).toContain('kain-elbi-data-');
		expect(source).toContain('uppetite-data-');
	});
});
