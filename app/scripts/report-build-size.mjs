import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const dist = resolve(process.cwd(), 'dist');

function assetUrls(html) {
	return Array.from(new Set(Array.from(html.matchAll(/["'](\/_astro\/[^"'?]+)["'?]/g), (match) => match[1])));
}

async function bytesFor(url) {
	return (await stat(resolve(dist, url.replace(/^\//, '')))).size;
}

async function reportPage(label, htmlPath) {
	const fullPath = resolve(dist, htmlPath);
	const html = await readFile(fullPath, 'utf8');
	const assets = assetUrls(html);
	const assetBytes = (await Promise.all(assets.map(bytesFor))).reduce((sum, bytes) => sum + bytes, 0);
	const htmlBytes = Buffer.byteLength(html);
	console.log(`${label}: HTML ${htmlBytes} B · directly referenced /_astro assets ${assetBytes} B · ${assets.length} assets`);
}

await reportPage('Home', 'index.html');
await reportPage('Explore', 'explore/index.html');
