import { validateCollections, validateRouteMatrix } from './contracts';
import { normalizePlaces } from './normalize';
import {
	emptyPlaceEnrichment,
	mergePlaceEnrichment,
	validatePlaceEnrichment,
} from './place-enrichment';
import {
	loadRuntimeDataManifest,
	readLastKnownGoodRuntimeDataManifest,
	rememberRuntimeDataManifest,
	type RuntimeDataManifest,
} from './runtime-manifest';
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

async function loadGeneration(manifest: RuntimeDataManifest): Promise<AppData> {
	const versioned = manifest.generation !== 'legacy-unversioned';
	const [rawPlaces, rawMatrix, rawCollections, rawEnrichment] = await Promise.all([
		fetchJson(manifest.files.places),
		fetchJson(manifest.files.routeMatrix),
		fetchJson(manifest.files.collections),
		versioned
			? fetchJson(manifest.files.placeEnrichment)
			: fetchOptionalJson(manifest.files.placeEnrichment, emptyPlaceEnrichment()),
	]);

	if (!Array.isArray(rawPlaces)) throw new Error('places.json must contain an array');

	let enrichment = emptyPlaceEnrichment();
	try {
		enrichment = validatePlaceEnrichment(rawEnrichment);
	} catch (cause) {
		// Legacy unversioned enrichment remains optional for compatibility.
		// In a versioned generation, malformed enrichment means the generation
		// is internally inconsistent and must not be partially activated.
		if (versioned) throw cause;
	}

	return {
		places: mergePlaceEnrichment(normalizePlaces(rawPlaces), enrichment),
		matrix: validateRouteMatrix(rawMatrix),
		collections: validateCollections(rawCollections),
	};
}

async function loadAtomicAppData(): Promise<AppData> {
	let currentManifest: RuntimeDataManifest;
	try {
		currentManifest = await loadRuntimeDataManifest();
	} catch (manifestError) {
		const previousManifest = readLastKnownGoodRuntimeDataManifest();
		if (previousManifest) {
			try {
				return await loadGeneration(previousManifest);
			} catch {
				// Preserve the manifest failure because it is the current deployment
				// signal; the cached generation is only a recovery path.
			}
		}
		throw manifestError;
	}

	try {
		const data = await loadGeneration(currentManifest);
		rememberRuntimeDataManifest(currentManifest);
		return data;
	} catch (currentError) {
		const previousManifest = readLastKnownGoodRuntimeDataManifest();
		if (!previousManifest || previousManifest.generation === currentManifest.generation) throw currentError;
		try {
			// A successful previous generation has already fetched all four core
			// files, so the service worker can satisfy these immutable URLs from its
			// retained previous data cache when the new deployment is incomplete.
			return await loadGeneration(previousManifest);
		} catch {
			throw currentError;
		}
	}
}

export function loadAppData(): Promise<AppData> {
	// The promise becomes the activation boundary: callers receive one fully
	// validated generation, never a mixture of independently refreshed files.
	appDataPromise ??= loadAtomicAppData();
	return appDataPromise;
}
