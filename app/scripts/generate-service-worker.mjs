import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative, resolve, sep } from 'node:path';
import { PWA_CLIENT_BOOTSTRAP_VERSION } from '../src/lib/pwa-update.mjs';

export const SERVICE_WORKER_SCHEMA_VERSION = 'release-gate-v3';

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
	return Array.from(
		html.matchAll(/(?:href|src|component-url|renderer-url|before-hydration-url)=["'](\/[^"'#?]+)["']/g),
		(match) => match[1],
	).filter((url) => url.startsWith('/_astro/'));
}

function staticImportReferences(source, importerUrl) {
	const references = [];
	const pattern = /(?:import|export)(?!\s*\()\s*(?:[^'";]*?\bfrom\s*)?["'](\.[^"']+)["']/g;
	for (const match of source.matchAll(pattern)) {
		references.push(new URL(match[1], `https://uppetite.local${importerUrl}`).pathname);
	}
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

	const result = Array.from(manifest)
		.filter((url) => allUrls.has(url) && !isForbidden(url))
		.sort();
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
const CLIENT_BOOTSTRAP_VERSION = ${JSON.stringify(PWA_CLIENT_BOOTSTRAP_VERSION)};
const STATIC_CACHE = 'uppetite-static-' + VERSION;
const DATA_CACHE = 'uppetite-data-' + VERSION;
const PRECACHE = ${JSON.stringify(cacheable)};
const PRIVATE_ROUTE_PREFIXES = ['/staff', '/auth', '/places-ops', '/api/auth', '/api/staff', '/api/ops', '/api/editor-picks'];

function isPrivateRoute(pathname) {
  return PRIVATE_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
}

function responseMayEnterCache(response) {
  const policy = (response.headers.get('Cache-Control') || '').toLowerCase();
  return response.ok && !/(?:^|[,\s])(?:private|no-store)(?:$|[,=\s])/.test(policy);
}

async function precacheShell() {
  const cache = await caches.open(STATIC_CACHE);
  await Promise.all(PRECACHE.map(async (url) => {
    const response = await fetch(url, { cache: 'reload' });
    if (!response.ok) throw new Error('Precache failed for ' + url + ': ' + response.status);
    await cache.put(url, response);
  }));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function probeClientVersion(client, timeoutMs = 750) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    let settled = false;

    const finish = (supported) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      channel.port1.close();
      resolve(supported);
    };

    const timer = setTimeout(() => finish(false), timeoutMs);

    channel.port1.onmessage = (event) => {
      finish(
        event.data?.type === 'UPPETITE_CLIENT_VERSION'
        && event.data?.version === CLIENT_BOOTSTRAP_VERSION
      );
    };

    try {
      client.postMessage(
        {
          type: 'UPPETITE_CLIENT_VERSION_PROBE',
          version: CLIENT_BOOTSTRAP_VERSION,
        },
        [channel.port2],
      );
    } catch {
      finish(false);
    }
  });
}

async function upgradeOpenClients() {
  const beforeClaim = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  const support = await Promise.all(
    beforeClaim.map((client) => probeClientVersion(client)),
  );

  const legacyClientIds = new Set(
    beforeClaim
      .filter((_, index) => !support[index])
      .map((client) => client.id),
  );

  await self.clients.claim();

  if (!legacyClientIds.size) return;

  /*
   * Some intermediate UPPETITE clients already understand
   * controllerchange but predate the capability probe. Give those
   * pages a moment to reload themselves, then probe again before
   * forcing navigation.
   */
  await delay(500);

  const afterClaim = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  await Promise.allSettled(
    afterClaim
      .filter((client) => legacyClientIds.has(client.id))
      .map(async (client) => {
        if (await probeClientVersion(client, 250)) return;

        try {
          if (typeof client.navigate === 'function') {
            await client.navigate(client.url);
            return;
          }
        } catch {
          // Fall through to the message fallback.
        }

        client.postMessage({ type: 'UPPETITE_FORCE_RELOAD' });
      }),
  );
}

async function deleteOldCaches() {
  const keys = await caches.keys();

  /*
   * Keep one previous shell and data generation as a compatibility bridge for
   * an old document that is in the middle of reloading. Versioned data paths
   * are immutable, so a previous data cache is safe as an offline fallback.
   */
  const previousStaticCaches = keys
    .filter((key) =>
      (key.startsWith('kain-elbi-static-') || key.startsWith('uppetite-static-'))
      && key !== STATIC_CACHE
    )
    .slice(-1);
  const previousDataCaches = keys
    .filter((key) =>
      (key.startsWith('kain-elbi-data-') || key.startsWith('uppetite-data-'))
      && key !== DATA_CACHE
    )
    .slice(-1);

  const keep = new Set([
    STATIC_CACHE,
    DATA_CACHE,
    ...previousStaticCaches,
    ...previousDataCaches,
  ]);

  await Promise.all(
    keys
      .filter((key) =>
        (key.startsWith('kain-elbi-') || key.startsWith('uppetite-'))
        && !keep.has(key)
      )
      .map((key) => caches.delete(key)),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      precacheShell(),
      self.skipWaiting(),
    ]),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await upgradeOpenClients();
      await deleteOldCaches();
    })(),
  );
});

async function navigation(request) {
  try {
    /*
     * HTML navigations should represent the current deployment.
     * Bypass the browser HTTP cache, while still allowing the edge/CDN
     * to satisfy the request according to its own revalidation rules.
     */
    const response = await fetch(request, { cache: 'no-store' });
    if (responseMayEnterCache(response)) (await caches.open(STATIC_CACHE)).put(request, response.clone());
    return response;
  } catch {
    const url = new URL(request.url);
    const indexPath = url.pathname.endsWith('/')
      ? url.pathname + 'index.html'
      : url.pathname + '/index.html';
    return (await caches.match(request))
      || (await caches.match(indexPath))
      || (await caches.match('/offline/index.html'))
      || (await caches.match('/offline.html'));
  }
}

async function latestDataManifest(request) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await caches.match(request)) || new Response(
      JSON.stringify({ error: 'offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

async function immutableData(request) {
  const cache = await caches.open(DATA_CACHE);
  const cached = (await cache.match(request)) || (await caches.match(request));
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function staleData(request) {
  const cache = await caches.open(DATA_CACHE);
  const cached = (await cache.match(request)) || (await caches.match(request));
  const fresh = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || fresh;
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;
  // Private/authenticated traffic is network-owned. Never serve or store it in the PWA Cache API.
  if (isPrivateRoute(url.pathname)) return;
  if (url.pathname === '/data/runtime-manifest.json') return event.respondWith(latestDataManifest(event.request));
  if (url.pathname.startsWith('/data/releases/')) return event.respondWith(immutableData(event.request));
  if (url.pathname.startsWith('/data/')) return event.respondWith(staleData(event.request));
  if (event.request.mode === 'navigate') return event.respondWith(navigation(event.request));
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }
});
`;

	await writeFile(join(distDir, 'sw.js'), source, 'utf8');
	// Mirror the generated worker into @astrojs/vercel's static Build Output tree.
	const adapterStaticDir = resolve(process.cwd(), '.vercel', 'output', 'static');
	try {
		await stat(adapterStaticDir);
		await writeFile(join(adapterStaticDir, 'sw.js'), source, 'utf8');
	} catch {
		// Local/static fallback: dist/sw.js above remains valid.
	}
	const bytes = await Promise.all(
		cacheable.map(async (url) => (await stat(toPath(distDir, url))).size),
	);
	const totalBytes = bytes.reduce((sum, size) => sum + size, 0);
	console.log(
		`Generated service worker ${version} with ${cacheable.length} precache entries (${totalBytes} bytes).`,
	);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) await generateServiceWorker();
