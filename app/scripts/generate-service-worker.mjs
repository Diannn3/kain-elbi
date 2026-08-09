import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, sep } from 'node:path';

export const SERVICE_WORKER_SCHEMA_VERSION = 'release-gate-v1';

async function walk(directory) {
	const paths = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) paths.push(...await walk(path));
		else paths.push(path);
	}
	return paths.sort((a, b) => a.localeCompare(b));
}

function toUrl(distDir, path) {
	return `/${relative(distDir, path).split(sep).join('/')}`;
}

function toPath(distDir, url) {
	return join(distDir, ...url.replace(/^\//, '').split('/'));
}

function htmlAssetReferences(html) {
	return Array.from(html.matchAll(/(?:href|src|component-url|renderer-url|before-hydration-url)=["'](\/[^"'#?]+)["']/g), (match) => match[1])
		.filter((url) => url.startsWith('/_astro/'));
}

function staticImportReferences(source, importerUrl) {
	const references = [];
	const pattern = /(?:import|export)(?!\s*\()\s*(?:[^'";]*?\bfrom\s*)?["'](\.[^"']+)["']/g;
	for (const match of source.matchAll(pattern)) references.push(new URL(match[1], `https://kain-elbi.local${importerUrl}`).pathname);
	return references;
}

function isForbidden(url) {
	return url.startsWith('/place/')
		|| url.startsWith('/data/')
		|| /(?:maplibre-gl|opening_hours|MapExperience|PlaceSheet)/i.test(url)
		|| /latin-ext|vietnamese/i.test(url)
		|| url.endsWith('.map');
}

export async function buildPrecacheManifest(distDir) {
	const fixed = [
		'/index.html',
		'/offline/index.html',
		'/manifest.webmanifest',
		'/favicon.svg',
		'/favicon.ico',
		'/icons/uppetite-192.png',
		'/icons/uppetite-512.png',
		'/icons/uppetite-maskable-512.png',
	];
	const allFiles = await walk(distDir);
	const allUrls = new Set(allFiles.map((path) => toUrl(distDir, path)));
	for (const url of fixed) {
		if (!allUrls.has(url)) throw new Error(`Required precache asset is missing: ${url}`);
	}

	const manifest = new Set(fixed);
	for (const htmlUrl of ['/index.html', '/offline/index.html']) {
		const html = await readFile(toPath(distDir, htmlUrl), 'utf8');
		for (const reference of htmlAssetReferences(html)) manifest.add(reference);
	}

	const queue = Array.from(manifest).filter((url) => url.endsWith('.js'));
	const scanned = new Set();
	while (queue.length) {
		const url = queue.shift();
		if (!url || scanned.has(url) || !allUrls.has(url) || isForbidden(url)) continue;
		scanned.add(url);
		const source = await readFile(toPath(distDir, url), 'utf8');
		for (const reference of staticImportReferences(source, url)) {
			if (!allUrls.has(reference) || isForbidden(reference)) continue;
			if (!manifest.has(reference)) {
				manifest.add(reference);
				if (reference.endsWith('.js')) queue.push(reference);
			}
		}
	}

	for (const url of allUrls) {
		if (/(?:sora|inter)-latin-wght-normal\.[^/]+\.woff2$/i.test(url)) manifest.add(url);
	}

	const result = Array.from(manifest).filter((url) => allUrls.has(url) && !isForbidden(url)).sort();
	if (result.some(isForbidden)) throw new Error('Forbidden lazy asset entered the precache manifest.');
	return result;
}

export async function hashDistContents(distDir, schemaVersion = SERVICE_WORKER_SCHEMA_VERSION) {
	const digest = createHash('sha256');
	digest.update(schemaVersion).update('\0');
	for (const path of await walk(distDir)) {
		if (path.endsWith(`${sep}sw.js`) || path === join(distDir, 'sw.js')) continue;
		digest.update(toUrl(distDir, path)).update('\0');
		digest.update(await readFile(path)).update('\0');
	}
	return digest.digest('hex').slice(0, 12);
}

export async function generateServiceWorker(distDir = resolve(process.cwd(), 'dist')) {
	const cacheable = await buildPrecacheManifest(distDir);
	const version = await hashDistContents(distDir);
	const source = `const VERSION = ${JSON.stringify(version)};
const STATIC_CACHE = 'uppetite-static-' + VERSION;
const DATA_CACHE = 'uppetite-data-' + VERSION;
const PRECACHE = ${JSON.stringify(cacheable)};

async function precacheShell() {
  const cache = await caches.open(STATIC_CACHE);
  await Promise.all(PRECACHE.map(async (url) => {
    const response = await fetch(url, { cache: 'reload' });
    if (!response.ok) throw new Error('Precache failed for ' + url + ': ' + response.status);
    await cache.put(url, response);
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => (key.startsWith('kain-elbi-') || key.startsWith('uppetite-')) && ![STATIC_CACHE, DATA_CACHE].includes(key)).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

async function navigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(STATIC_CACHE)).put(request, response.clone());
    return response;
  } catch {
    const url = new URL(request.url);
    const indexPath = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname + '/index.html';
    return (await caches.match(request)) || (await caches.match(indexPath)) || (await caches.match('/offline/index.html')) || (await caches.match('/offline.html'));
  }
}

async function staleData(request) {
  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(request);
  const fresh = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || fresh;
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/data/')) return event.respondWith(staleData(event.request));
  if (event.request.mode === 'navigate') return event.respondWith(navigation(event.request));
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') return self.skipWaiting();
});
`;

	await writeFile(join(distDir, 'sw.js'), source, 'utf8');
	const bytes = await Promise.all(cacheable.map(async (url) => (await stat(toPath(distDir, url))).size));
	const totalBytes = bytes.reduce((sum, size) => sum + size, 0);
	console.log(`Generated service worker ${version} with ${cacheable.length} precache entries (${totalBytes} bytes).`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) await generateServiceWorker();
