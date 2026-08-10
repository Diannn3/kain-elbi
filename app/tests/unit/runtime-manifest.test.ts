import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	LEGACY_RUNTIME_DATA_MANIFEST,
	loadRuntimeDataManifest,
	validateRuntimeDataManifest,
} from '../../src/lib/data/runtime-manifest';

const generation = 'abcdef123456';
const manifest = {
	schemaVersion: 1 as const,
	generation,
	files: {
		places: `/data/releases/${generation}/places.json`,
		routeMatrix: `/data/releases/${generation}/route_matrix.json`,
		collections: `/data/releases/${generation}/collections.json`,
		placeEnrichment: `/data/releases/${generation}/place_enrichment.json`,
	},
};

afterEach(() => vi.unstubAllGlobals());

describe('runtime data manifest', () => {
	it('accepts one self-consistent immutable generation', () => {
		expect(validateRuntimeDataManifest(manifest)).toEqual(manifest);
	});

	it('rejects a path pointing at another generation', () => {
		expect(() => validateRuntimeDataManifest({
			...manifest,
			files: { ...manifest.files, places: '/data/releases/000000000000/places.json' },
		})).toThrow(/places path/i);
	});

	it('falls back to legacy files only when the manifest endpoint does not exist yet', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));
		await expect(loadRuntimeDataManifest()).resolves.toEqual(LEGACY_RUNTIME_DATA_MANIFEST);
	});

	it('does not disguise a server failure as a coherent legacy deployment', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));
		await expect(loadRuntimeDataManifest()).rejects.toThrow(/503/);
	});
});
