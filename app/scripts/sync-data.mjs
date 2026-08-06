import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const appRoot = process.cwd();
const sourceRoot = resolve(appRoot, '..', 'data');
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

await syncRequired('places.json', (value) => {
	if (!Array.isArray(value) || value.length === 0) throw new Error('places.json must contain records');
});

await syncRequired('route_matrix.json', (value) => {
	for (const key of [
		'schema_version',
		'generated_at',
		'anchors',
		'anchor_to_place_seconds',
		'place_to_anchor_seconds',
		'anchor_to_anchor_seconds',
	]) {
		if (!(key in value)) throw new Error(`route_matrix.json is missing ${key}`);
	}
});

await syncRequired('collections.json', (value) => {
	if (!Array.isArray(value)) throw new Error('collections.json must contain an array');
	for (const [index, item] of value.entries()) {
		if (!item.researchDate) throw new Error(`collections.json item ${index} is missing researchDate`);
		if (!Array.isArray(item.sourceUrls)) {
			throw new Error(`collections.json item ${index} is missing sourceUrls`);
		}
	}
}, (value) => value.map((item) => ({
	id: item.id,
	slug: item.slug ?? item.id,
	title: item.title,
	description: item.description?.replace(/\bthe best cafes\b/i, 'cafes'),
	researchDate: item.researchDate ?? item.research_date,
	evidenceCount: item.evidenceCount ?? item.evidence_count ?? 0,
	sourceUrls: item.sourceUrls ?? item.source_urls ?? [],
	coverVariant: item.coverVariant ?? item.cover_metadata?.theme ?? 'forest',
	placeIds: item.placeIds ?? item.place_ids ?? [],
})));
