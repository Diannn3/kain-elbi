import { validateCollections, validateRouteMatrix } from './contracts';
import { normalizePlaces } from './normalize';
import {
	emptyPlaceEnrichment,
	mergePlaceEnrichment,
	validatePlaceEnrichment,
} from './place-enrichment';
import type { Collection, Place, RouteMatrix } from '../types';

export interface AppData {
	places: Place[];
	matrix: RouteMatrix;
	collections: Collection[];
}

let appDataPromise: Promise<AppData> | undefined;

async function fetchJson(path: string): Promise<unknown> {
	const response = await fetch(path);
	if (!response.ok) throw new Error(`Could not load ${path}. Try refreshing when you are online.`);
	return response.json();
}

async function fetchOptionalJson(path: string, fallback: unknown): Promise<unknown> {
	try {
		const response = await fetch(path);
		if (!response.ok) return fallback;
		return response.json();
	} catch {
		return fallback;
	}
}

export function loadAppData(): Promise<AppData> {
	appDataPromise ??= Promise.all([
		fetchJson('/data/places.json'),
		fetchJson('/data/route_matrix.json'),
		fetchJson('/data/collections.json'),
		/*
		 * Enrichment improves the experience but must never make Smart Picks
		 * unavailable offline or during a partial deployment.
		 */
		fetchOptionalJson('/data/place_enrichment.json', emptyPlaceEnrichment()),
	]).then(([rawPlaces, rawMatrix, rawCollections, rawEnrichment]) => {
		if (!Array.isArray(rawPlaces)) throw new Error('places.json must contain an array');

		let enrichment = emptyPlaceEnrichment();
		try {
			enrichment = validatePlaceEnrichment(rawEnrichment);
		} catch {
			// Optional enrichment is allowed to fail closed at runtime.
		}

		return {
			places: mergePlaceEnrichment(normalizePlaces(rawPlaces), enrichment),
			matrix: validateRouteMatrix(rawMatrix),
			collections: validateCollections(rawCollections),
		};
	});
	return appDataPromise;
}
