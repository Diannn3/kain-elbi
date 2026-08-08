import type { Collection, FoodZone, FreshieData, RouteMatrix } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireKey(record: Record<string, unknown>, key: string, filename: string): unknown {
	if (!(key in record) || record[key] === null || record[key] === '') {
		throw new Error(`${filename} is missing ${key}`);
	}
	return record[key];
}

export function validateRouteMatrix(value: unknown): RouteMatrix {
	if (!isRecord(value)) throw new Error('route_matrix.json must contain an object');
	const schema = value.schema_version;
	if (schema !== 1 && schema !== 2) throw new Error('route_matrix.json must use schema_version 1 or 2');
	requireKey(value, 'generated_at', 'route_matrix.json');
	requireKey(value, 'walking_speed_mps', 'route_matrix.json');
	const keys = schema === 2
		? ['anchors', 'anchor_to_place', 'place_to_anchor', 'anchor_to_anchor']
		: ['anchors', 'anchor_to_place_seconds', 'place_to_anchor_seconds', 'anchor_to_anchor_seconds'];
	for (const key of keys) {
		if (!isRecord(requireKey(value, key, 'route_matrix.json'))) {
			throw new Error(`route_matrix.json ${key} must contain an object`);
		}
	}
	if (schema === 2) {
		if (!isRecord(requireKey(value, 'routing', 'route_matrix.json'))) {
			throw new Error('route_matrix.json routing must contain an object');
		}
		if (!isRecord(requireKey(value, 'place_snaps', 'route_matrix.json'))) {
			throw new Error('route_matrix.json place_snaps must contain an object');
		}
		const routing = value.routing as Record<string, unknown>;
		if (!isRecord(requireKey(routing, 'snap_thresholds_m', 'route_matrix.json routing'))) {
			throw new Error('route_matrix.json routing snap_thresholds_m must contain an object');
		}
		const thresholds = routing.snap_thresholds_m as Record<string, unknown>;
		const good = Number(thresholds.good);
		const placeMax = Number(thresholds.place_max);
		const anchorMax = Number(thresholds.anchor_max);
		if (!Number.isFinite(good) || good > 40) throw new Error('route_matrix.json good snap threshold must be <= 40m');
		if (!Number.isFinite(placeMax) || placeMax > 100) throw new Error('route_matrix.json place snap threshold must be <= 100m');
		if (!Number.isFinite(anchorMax) || anchorMax > 100) throw new Error('route_matrix.json anchor snap threshold must be <= 100m');
	}
	return value as unknown as RouteMatrix;
}

export function validateCollections(value: unknown): Collection[] {
	if (!Array.isArray(value)) throw new Error('collections.json must contain an array');
	return value.map((entry, index) => {
		if (!isRecord(entry)) throw new Error(`collections.json item ${index} must contain an object`);
		for (const key of [
			'id',
			'slug',
			'title',
			'description',
			'researchDate',
			'evidenceCount',
			'sourceUrls',
			'coverVariant',
			'placeIds',
		]) {
			if (!(key in entry) || entry[key] === null || entry[key] === '') {
				throw new Error(`collections.json item ${index} is missing ${key}`);
			}
		}
		return entry as unknown as Collection;
	});
}


export function validateZones(value: unknown): FoodZone[] {
	if (!Array.isArray(value)) throw new Error('zones.json must contain an array');
	return value.map((entry, index) => {
		if (!isRecord(entry)) throw new Error(`zones.json item ${index} must contain an object`);
		for (const key of ['id', 'name', 'shortName', 'description', 'priority', 'placeIds', 'placeCount']) {
			if (!(key in entry) || entry[key] === null || entry[key] === '') {
				throw new Error(`zones.json item ${index} is missing ${key}`);
			}
		}
		if (!Array.isArray(entry.placeIds)) throw new Error(`zones.json item ${index} placeIds must contain an array`);
		return entry as unknown as FoodZone;
	});
}

export function validateFreshie(value: unknown): FreshieData {
	if (!isRecord(value)) throw new Error('freshie.json must contain an object');
	for (const key of ['version', 'researchDate', 'intro', 'starterCollectionId', 'sourceNote', 'situations', 'glossary', 'mentions', 'sources']) {
		if (!(key in value) || value[key] === null) throw new Error(`freshie.json is missing ${key}`);
	}
	if (!Array.isArray(value.situations) || !Array.isArray(value.glossary) || !Array.isArray(value.mentions) || !isRecord(value.sources)) {
		throw new Error('freshie.json has invalid situations/glossary/mentions/sources');
	}
	return value as unknown as FreshieData;
}
