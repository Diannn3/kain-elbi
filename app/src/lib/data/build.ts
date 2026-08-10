import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateCollections, validateFreshie, validateRouteMatrix, validateZones } from './contracts';
import { normalizePlaces } from './normalize';
import { mergePlaceEnrichment, validatePlaceEnrichment } from './place-enrichment';
import { validateCommunityImpact, validateFoodEvents } from './community-ops';

async function readJson(filename: string): Promise<unknown> {
	return JSON.parse(await readFile(resolve(process.cwd(), 'public', 'data', filename), 'utf8'));
}

export async function loadBuildData() {
	const [
		rawPlaces,
		rawMatrix,
		rawCollections,
		rawZones,
		rawFreshie,
		rawEnrichment,
		rawEvents,
		rawCommunityImpact,
	] = await Promise.all([
		readJson('places.json'),
		readJson('route_matrix.json'),
		readJson('collections.json'),
		readJson('zones.json'),
		readJson('freshie.json'),
		readJson('place_enrichment.json'),
		readJson('events.json'),
		readJson('community_impact.json'),
	]);
	if (!Array.isArray(rawPlaces)) throw new Error('places.json must contain an array');

	const places = normalizePlaces(rawPlaces);
	const enrichment = validatePlaceEnrichment(rawEnrichment);

	return {
		places: mergePlaceEnrichment(places, enrichment, { strict: true }),
		matrix: validateRouteMatrix(rawMatrix),
		collections: validateCollections(rawCollections),
		zones: validateZones(rawZones),
		freshie: validateFreshie(rawFreshie),
		enrichment,
		events: validateFoodEvents(rawEvents).events,
		communityImpact: validateCommunityImpact(rawCommunityImpact),
	};
}
