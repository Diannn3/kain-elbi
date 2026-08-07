import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const dist = resolve(process.cwd(), 'dist');
const types = {
	'.css': 'text/css; charset=utf-8',
	'.html': 'text/html; charset=utf-8',
	'.ico': 'image/x-icon',
	'.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.webmanifest': 'application/manifest+json; charset=utf-8',
	'.woff2': 'font/woff2',
};

async function fileFor(pathname) {
	const clean = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
	const base = join(dist, clean);
	const candidates = extname(base) ? [base] : [join(base, 'index.html')];
	for (const candidate of candidates) {
		const resolved = resolve(candidate);
		if (resolved !== dist && !resolved.startsWith(`${dist}${sep}`)) continue;
		try {
			if ((await stat(resolved)).isFile()) return resolved;
		} catch {
			// Try the next safe candidate.
		}
	}
	return join(dist, '404.html');
}

const server = createServer(async (request, response) => {
	try {
		const file = await fileFor(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
		const info = await stat(file);
		response.writeHead(file.endsWith(`${sep}404.html`) ? 404 : 200, {
			'Content-Type': types[extname(file)] ?? 'application/octet-stream',
			'Content-Length': info.size,
			'Cache-Control': 'no-cache',
		});
		if (request.method === 'HEAD') response.end();
		else createReadStream(file).pipe(response);
	} catch {
		response.writeHead(500).end('Preview error');
	}
});

server.listen(4322, '127.0.0.1');
const close = () => server.close(() => process.exit(0));
process.once('SIGINT', close);
process.once('SIGTERM', close);
