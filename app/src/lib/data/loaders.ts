import { validateCollections, validateRouteMatrix } from './contracts';
import { normalizePlaces } from './normalize';
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

export function loadAppData(): Promise<AppData> {
	appDataPromise ??= Promise.all([
		fetchJson('/data/places.json'),
		fetchJson('/data/route_matrix.json'),
		fetchJson('/data/collections.json'),
	]).then(([rawPlaces, rawMatrix, rawCollections]) => {
		if (!Array.isArray(rawPlaces)) throw new Error('places.json must contain an array');
		return {
			places: normalizePlaces(rawPlaces),
			matrix: validateRouteMatrix(rawMatrix),
			collections: validateCollections(rawCollections),
		};
	});
	return appDataPromise;
}
