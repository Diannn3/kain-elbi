import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const appRoot = process.cwd();
const sourceRoot = resolve(appRoot, '..', 'data');
const roomTbaRoot = resolve(sourceRoot, 'upstream', 'room-tba');
const outputRoot = resolve(appRoot, 'public', 'data');

await mkdir(outputRoot, { recursive: true });

async function parseJson(path, label) {
	try {
		return JSON.parse(await readFile(path, 'utf8'));
	} catch (error) {
		throw new Error(`${label} is not valid JSON: ${error.message}`);
	}
}

async function syncRequired(filename, validate, transform) {
	const source = resolve(sourceRoot, filename);
	if (!existsSync(source)) {
		throw new Error(`${filename} is missing from ${sourceRoot}. Canonical route and collection fixtures are not allowed.`);
	}
	const sourceValue = await parseJson(source, filename);
	const parsed = transform ? transform(sourceValue) : sourceValue;
	validate(parsed);
	if (!transform) await copyFile(source, resolve(outputRoot, filename));
	else await writeFile(resolve(outputRoot, filename), `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
	process.stdout.write(`synced canonical ${filename}\n`);
}

async function syncOptional(filename, root = sourceRoot) {
	const source = resolve(root, filename);
	if (!existsSync(source)) return;
	await parseJson(source, filename);
	await copyFile(source, resolve(outputRoot, filename));
	process.stdout.write(`synced optional ${filename}\n`);
}

await syncRequired('places.json', (value) => {
	if (!Array.isArray(value) || value.length === 0) throw new Error('places.json must contain records');
});

await syncRequired('route_matrix.json', (value) => {
	if (value.schema_version === 1) {
		for (const key of ['generated_at', 'anchors', 'anchor_to_place_seconds', 'place_to_anchor_seconds', 'anchor_to_anchor_seconds']) {
			if (!(key in value)) throw new Error(`route_matrix.json is missing ${key}`);
		}
		return;
	}
	if (value.schema_version === 2) {
		for (const key of ['generated_at', 'anchors', 'routing', 'place_snaps', 'anchor_to_place', 'place_to_anchor', 'anchor_to_anchor']) {
			if (!(key in value)) throw new Error(`route_matrix.json is missing ${key}`);
		}
		const thresholds = value.routing?.snap_thresholds_m;
		if (!thresholds || Number(thresholds.good) > 40 || Number(thresholds.place_max) > 100 || Number(thresholds.anchor_max) > 100) {
			throw new Error('route_matrix.json must use <=40m good and <=100m place/anchor snap thresholds');
		}
		return;
	}
	throw new Error('route_matrix.json must use schema_version 1 or 2');
});

await syncRequired('collections.json', (value) => {
	if (!Array.isArray(value)) throw new Error('collections.json must contain an array');
	for (const [index, item] of value.entries()) {
		if (!item.researchDate) throw new Error(`collections.json item ${index} is missing researchDate`);
		if (!Array.isArray(item.sourceUrls)) throw new Error(`collections.json item ${index} is missing sourceUrls`);
	}
}, (value) => value.map((item) => ({
	id: item.id,
	slug: item.slug ?? item.id,
	title: item.title,
	description: item.description,
	researchDate: item.researchDate ?? item.research_date,
	evidenceCount: item.evidenceCount ?? item.evidence_count ?? 0,
	sourceUrls: item.sourceUrls ?? item.source_urls ?? [],
	coverVariant: item.coverVariant ?? item.cover_metadata?.theme ?? 'forest',
	placeIds: item.placeIds ?? item.place_ids ?? [],
})));



await syncRequired('zones.json', (value) => {
	if (!Array.isArray(value) || value.length === 0) throw new Error('zones.json must contain zone records');
	for (const [index, item] of value.entries()) {
		if (!item.id || !item.name || !Array.isArray(item.placeIds)) throw new Error(`zones.json item ${index} is invalid`);
	}
}, (value) => value.map((item) => ({
	id: item.id,
	name: item.name,
	shortName: item.shortName ?? item.short_name ?? item.name,
	description: item.description,
	priority: Number(item.priority ?? 0),
	bounds: item.bounds ? {
		minLat: Number(item.bounds.minLat ?? item.bounds.min_lat),
		maxLat: Number(item.bounds.maxLat ?? item.bounds.max_lat),
		minLon: Number(item.bounds.minLon ?? item.bounds.min_lon),
		maxLon: Number(item.bounds.maxLon ?? item.bounds.max_lon),
	} : null,
	placeIds: item.placeIds ?? item.place_ids ?? [],
	placeCount: Number(item.placeCount ?? item.place_count ?? (item.placeIds ?? item.place_ids ?? []).length),
})));

await syncRequired('freshie.json', (value) => {
	if (!value || typeof value !== 'object') throw new Error('freshie.json must contain an object');
	if (!value.researchDate || !value.starterCollectionId) throw new Error('freshie.json is missing researchDate/starterCollectionId');
	if (!Array.isArray(value.situations) || !Array.isArray(value.glossary) || !Array.isArray(value.mentions)) {
		throw new Error('freshie.json is missing situations/glossary/mentions');
	}
});

await syncOptional('manifest.json');
await syncOptional('anchor_aliases.json');
await syncOptional('walk-graph.json', roomTbaRoot);
