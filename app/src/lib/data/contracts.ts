import type { Collection, RouteMatrixV1 } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireKey(record: Record<string, unknown>, key: string, filename: string): unknown {
	if (!(key in record) || record[key] === null || record[key] === '') {
		throw new Error(`${filename} is missing ${key}`);
	}
	return record[key];
}

export function validateRouteMatrix(value: unknown): RouteMatrixV1 {
	if (!isRecord(value)) throw new Error('route_matrix.json must contain an object');
	if (value.schema_version !== 1) throw new Error('route_matrix.json must use schema_version 1');
	requireKey(value, 'generated_at', 'route_matrix.json');
	requireKey(value, 'walking_speed_mps', 'route_matrix.json');
	for (const key of [
		'anchors',
		'anchor_to_place_seconds',
		'place_to_anchor_seconds',
		'anchor_to_anchor_seconds',
	]) {
		if (!isRecord(requireKey(value, key, 'route_matrix.json'))) {
			throw new Error(`route_matrix.json ${key} must contain an object`);
		}
	}
	return value as unknown as RouteMatrixV1;
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
