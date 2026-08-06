import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

const dist = resolve(process.cwd(), 'dist');

async function walk(directory) {
	const paths = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) paths.push(...await walk(path));
		else paths.push(path);
	}
	return paths;
}

const files = (await walk(dist)).filter((path) => !path.endsWith('sw.js'));
const cacheable = files
	.filter((path) => /\.(?:html|js|css|woff2|svg|png|webmanifest|json)$/.test(path))
	.filter((path) => !path.includes(`${sep}data${sep}`))
	.map((path) => `/${relative(dist, path).split(sep).join('/')}`)
	.sort();
const digest = createHash('sha256');
for (const path of files) {
	const info = await stat(path);
	digest.update(relative(dist, path)).update(String(info.size));
}
const version = digest.digest('hex').slice(0, 12);

const source = `const VERSION = ${JSON.stringify(version)};
const STATIC_CACHE = 'kain-elbi-static-' + VERSION;
const DATA_CACHE = 'kain-elbi-data-' + VERSION;
const PRECACHE = ${JSON.stringify(cacheable)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('kain-elbi-') && ![STATIC_CACHE, DATA_CACHE].includes(key)).map((key) => caches.delete(key)))),
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

await writeFile(join(dist, 'sw.js'), source, 'utf8');
console.log(`Generated service worker ${version} with ${cacheable.length} precache entries.`);
