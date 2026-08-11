import { STORAGE_KEYS } from '../storage-keys';

export interface RuntimeDataManifest {
	schemaVersion: 1;
	generation: string;
	files: {
		places: string;
		routeMatrix: string;
		collections: string;
		placeEnrichment: string;
	};
}

const LEGACY_FILES: RuntimeDataManifest['files'] = Object.freeze({
	places: '/data/places.json',
	routeMatrix: '/data/route_matrix.json',
	collections: '/data/collections.json',
	placeEnrichment: '/data/place_enrichment.json',
});

export const LEGACY_RUNTIME_DATA_MANIFEST: RuntimeDataManifest = Object.freeze({
	schemaVersion: 1,
	generation: 'legacy-unversioned',
	files: LEGACY_FILES,
});

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isReleasePath(value: unknown, generation: string, filename: string): value is string {
	return typeof value === 'string'
		&& value === `/data/releases/${generation}/${filename}`;
}

export function validateRuntimeDataManifest(value: unknown): RuntimeDataManifest {
	if (!isRecord(value) || value.schemaVersion !== 1) {
		throw new Error('runtime-manifest.json must use schemaVersion 1');
	}
	if (typeof value.generation !== 'string' || !/^[a-f0-9]{12}$/.test(value.generation)) {
		throw new Error('runtime-manifest.json has an invalid generation');
	}
	if (!isRecord(value.files)) throw new Error('runtime-manifest.json is missing files');
	const generation = value.generation;
	if (!isReleasePath(value.files.places, generation, 'places.json')) throw new Error('runtime-manifest.json places path is invalid');
	if (!isReleasePath(value.files.routeMatrix, generation, 'route_matrix.json')) throw new Error('runtime-manifest.json routeMatrix path is invalid');
	if (!isReleasePath(value.files.collections, generation, 'collections.json')) throw new Error('runtime-manifest.json collections path is invalid');
	if (!isReleasePath(value.files.placeEnrichment, generation, 'place_enrichment.json')) throw new Error('runtime-manifest.json placeEnrichment path is invalid');
	return value as unknown as RuntimeDataManifest;
}

export async function loadRuntimeDataManifest(): Promise<RuntimeDataManifest> {
	try {
		const response = await fetch('/data/runtime-manifest.json', { cache: 'no-cache' });
		// A 404 is the expected compatibility state while rolling out this
		// feature to a deployment that predates runtime manifests. Other HTTP
		// failures are not evidence that legacy data is coherent, so fail closed
		// and let the app-data loader try its last-known-good generation.
		if (response.status === 404) return LEGACY_RUNTIME_DATA_MANIFEST;
		if (!response.ok) throw new Error(`Could not load runtime data manifest (${response.status}).`);
		return validateRuntimeDataManifest(await response.json());
	} catch (error) {
		// Backward compatibility for a tab controlled by a pre-versioned service
		// worker or during the first deployment that introduces the manifest.
		if (error instanceof TypeError) return LEGACY_RUNTIME_DATA_MANIFEST;
		throw error;
	}
}

function getLocalStorage(): Storage | undefined {
	if (typeof window === 'undefined') return undefined;
	try {
		return window.localStorage;
	} catch {
		return undefined;
	}
}

export function readLastKnownGoodRuntimeDataManifest(): RuntimeDataManifest | undefined {
	const storage = getLocalStorage();
	if (!storage) return undefined;
	try {
		const raw = storage.getItem(STORAGE_KEYS.runtimeDataManifest);
		if (!raw) return undefined;
		const parsed: unknown = JSON.parse(raw);
		return validateRuntimeDataManifest(parsed);
	} catch {
		return undefined;
	}
}

export function rememberRuntimeDataManifest(manifest: RuntimeDataManifest): void {
	const storage = getLocalStorage();
	if (!storage || manifest.generation === 'legacy-unversioned') return;
	try {
		storage.setItem(STORAGE_KEYS.runtimeDataManifest, JSON.stringify(manifest));
	} catch {
		// Keep optional. Do not break app if storage is full.
	}
}
