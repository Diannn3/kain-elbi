import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateCollections, validateFreshie, validateRouteMatrix, validateZones } from './contracts';
import { normalizePlaces } from './normalize';

async function readJson(filename: string): Promise<unknown> {
	return JSON.parse(await readFile(resolve(process.cwd(), 'public', 'data', filename), 'utf8'));
}

export async function loadBuildData() {
	const [rawPlaces, rawMatrix, rawCollections, rawZones, rawFreshie] = await Promise.all([
		readJson('places.json'),
		readJson('route_matrix.json'),
		readJson('collections.json'),
		readJson('zones.json'),
		readJson('freshie.json'),
	]);
	if (!Array.isArray(rawPlaces)) throw new Error('places.json must contain an array');
	return {
		places: normalizePlaces(rawPlaces),
		matrix: validateRouteMatrix(rawMatrix),
		collections: validateCollections(rawCollections),
		zones: validateZones(rawZones),
		freshie: validateFreshie(rawFreshie),
	};
}
