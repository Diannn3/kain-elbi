import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const dist = resolve(process.cwd(), 'dist');
const KIB = 1024;

const routes = [
	{ label: 'Home', htmlPath: 'index.html', budget: Number(process.env.BUDGET_HOME_BYTES ?? 900 * KIB) },
	{ label: 'Explore', htmlPath: 'explore/index.html', budget: Number(process.env.BUDGET_EXPLORE_BYTES ?? 900 * KIB) },
	{ label: 'Smart Picks', htmlPath: 'picks/index.html', budget: Number(process.env.BUDGET_PICKS_BYTES ?? 900 * KIB) },
	{ label: 'Freshie', htmlPath: 'freshie/index.html', budget: Number(process.env.BUDGET_FRESHIE_BYTES ?? 900 * KIB) },
];

function assetUrls(html) {
	return Array.from(new Set(Array.from(html.matchAll(/["'](\/_astro\/[^"'?]+)["'?]/g), (match) => match[1])));
}

async function bytesFor(url) {
	return (await stat(resolve(dist, url.replace(/^\//, '')))).size;
}

function formatBytes(bytes) {
	return `${(bytes / KIB).toFixed(1)} KiB`;
}

async function reportPage({ label, htmlPath, budget }) {
	if (!Number.isFinite(budget) || budget <= 0) throw new Error(`${label} build-size budget must be a positive number.`);
	const fullPath = resolve(dist, htmlPath);
	const html = await readFile(fullPath, 'utf8');
	const assets = assetUrls(html);
	const assetBytes = (await Promise.all(assets.map(bytesFor))).reduce((sum, bytes) => sum + bytes, 0);
	const htmlBytes = Buffer.byteLength(html);
	const total = htmlBytes + assetBytes;
	const status = total <= budget ? 'PASS' : 'FAIL';
	console.log(`${status} ${label}: HTML ${formatBytes(htmlBytes)} · directly referenced /_astro assets ${formatBytes(assetBytes)} · initial ${formatBytes(total)} / ${formatBytes(budget)} budget · ${assets.length} assets`);
	return { label, total, budget, passed: total <= budget };
}

const reports = await Promise.all(routes.map(reportPage));
const failures = reports.filter((report) => !report.passed);
if (failures.length) {
	console.error(`Build-size budget exceeded: ${failures.map((failure) => `${failure.label} (${formatBytes(failure.total)} > ${formatBytes(failure.budget)})`).join(', ')}`);
	process.exitCode = 1;
}
