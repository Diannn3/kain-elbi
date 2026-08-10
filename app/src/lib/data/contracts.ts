import type { Collection, FoodZone, FreshieData, RouteMatrix } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
	if (!isRecord(value)) throw new Error(`${label} must contain an object`);
	return value;
}

function requireKey(record: Record<string, unknown>, key: string, filename: string): unknown {
	if (!(key in record) || record[key] === null) {
		throw new Error(`${filename} is missing ${key}`);
	}
	return record[key];
}

function requireString(value: unknown, label: string, allowEmpty = false): string {
	if (typeof value !== 'string' || (!allowEmpty && !value.trim())) {
		throw new Error(`${label} must contain a${allowEmpty ? '' : ' non-empty'} string`);
	}
	return value;
}

function requireFiniteNumber(value: unknown, label: string, minimum?: number): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || (minimum !== undefined && value < minimum)) {
		throw new Error(`${label} must contain a finite number${minimum !== undefined ? ` >= ${minimum}` : ''}`);
	}
	return value;
}

function requireInteger(value: unknown, label: string, minimum = Number.MIN_SAFE_INTEGER): number {
	const parsed = requireFiniteNumber(value, label, minimum);
	if (!Number.isInteger(parsed)) throw new Error(`${label} must contain an integer`);
	return parsed;
}

function requireStringArray(value: unknown, label: string): string[] {
	if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) {
		throw new Error(`${label} must contain an array of non-empty strings`);
	}
	return value;
}

function validateLatitude(value: unknown, label: string): number {
	const parsed = requireFiniteNumber(value, label);
	if (parsed < -90 || parsed > 90) throw new Error(`${label} must be between -90 and 90`);
	return parsed;
}

function validateLongitude(value: unknown, label: string): number {
	const parsed = requireFiniteNumber(value, label);
	if (parsed < -180 || parsed > 180) throw new Error(`${label} must be between -180 and 180`);
	return parsed;
}

function validateAnchor(value: unknown, label: string): void {
	const anchor = requireRecord(value, label);
	requireString(requireKey(anchor, 'id', label), `${label}.id`);
	requireString(requireKey(anchor, 'name', label), `${label}.name`);
	validateLatitude(requireKey(anchor, 'lat', label), `${label}.lat`);
	validateLongitude(requireKey(anchor, 'lon', label), `${label}.lon`);
	if (anchor.legacy_id !== undefined) requireString(anchor.legacy_id, `${label}.legacy_id`);
	if (anchor.graph_node_index !== undefined) requireInteger(anchor.graph_node_index, `${label}.graph_node_index`, 0);
	if (anchor.graph_node_osm_id !== undefined) requireFiniteNumber(anchor.graph_node_osm_id, `${label}.graph_node_osm_id`);
	if (anchor.snap_distance_m !== undefined) requireFiniteNumber(anchor.snap_distance_m, `${label}.snap_distance_m`, 0);
	if (anchor.snap_status !== undefined && !['good', 'review', 'unsupported'].includes(String(anchor.snap_status))) {
		throw new Error(`${label}.snap_status is invalid`);
	}
}

function validateAnchorMap(value: unknown, label: string): void {
	const anchors = requireRecord(value, label);
	for (const [id, anchor] of Object.entries(anchors)) {
		validateAnchor(anchor, `${label}.${id}`);
		const record = anchor as Record<string, unknown>;
		if (record.id !== id) throw new Error(`${label}.${id}.id must match its map key`);
	}
}

function validateNumericMatrix(value: unknown, label: string): void {
	const outer = requireRecord(value, label);
	for (const [from, rawRow] of Object.entries(outer)) {
		const row = requireRecord(rawRow, `${label}.${from}`);
		for (const [to, seconds] of Object.entries(row)) {
			requireFiniteNumber(seconds, `${label}.${from}.${to}`, 0);
		}
	}
}

function validateRouteLeg(value: unknown, label: string): void {
	const leg = requireRecord(value, label);
	requireFiniteNumber(requireKey(leg, 'seconds', label), `${label}.seconds`, 0);
	for (const key of ['meters', 'graph_meters', 'from_snap_meters', 'to_snap_meters'] as const) {
		if (leg[key] !== undefined) requireFiniteNumber(leg[key], `${label}.${key}`, 0);
	}
}

function validateRouteLegMatrix(value: unknown, label: string): void {
	const outer = requireRecord(value, label);
	for (const [from, rawRow] of Object.entries(outer)) {
		const row = requireRecord(rawRow, `${label}.${from}`);
		for (const [to, leg] of Object.entries(row)) validateRouteLeg(leg, `${label}.${from}.${to}`);
	}
}

function validatePlaceSnaps(value: unknown, label: string): void {
	const snaps = requireRecord(value, label);
	for (const [placeId, rawSnap] of Object.entries(snaps)) {
		const snap = requireRecord(rawSnap, `${label}.${placeId}`);
		requireInteger(requireKey(snap, 'graph_node_index', `${label}.${placeId}`), `${label}.${placeId}.graph_node_index`, 0);
		requireFiniteNumber(requireKey(snap, 'graph_node_osm_id', `${label}.${placeId}`), `${label}.${placeId}.graph_node_osm_id`);
		requireFiniteNumber(requireKey(snap, 'snap_distance_m', `${label}.${placeId}`), `${label}.${placeId}.snap_distance_m`, 0);
		const status = requireString(requireKey(snap, 'status', `${label}.${placeId}`), `${label}.${placeId}.status`);
		if (!['good', 'review', 'unsupported'].includes(status)) throw new Error(`${label}.${placeId}.status is invalid`);
	}
}

export function validateRouteMatrix(value: unknown): RouteMatrix {
	const matrix = requireRecord(value, 'route_matrix.json');
	const schema = matrix.schema_version;
	if (schema !== 1 && schema !== 2) throw new Error('route_matrix.json must use schema_version 1 or 2');
	requireString(requireKey(matrix, 'generated_at', 'route_matrix.json'), 'route_matrix.json.generated_at');
	requireFiniteNumber(requireKey(matrix, 'walking_speed_mps', 'route_matrix.json'), 'route_matrix.json.walking_speed_mps', 0.01);
	validateAnchorMap(requireKey(matrix, 'anchors', 'route_matrix.json'), 'route_matrix.json.anchors');

	if (schema === 1) {
		validateNumericMatrix(requireKey(matrix, 'anchor_to_place_seconds', 'route_matrix.json'), 'route_matrix.json.anchor_to_place_seconds');
		validateNumericMatrix(requireKey(matrix, 'place_to_anchor_seconds', 'route_matrix.json'), 'route_matrix.json.place_to_anchor_seconds');
		validateNumericMatrix(requireKey(matrix, 'anchor_to_anchor_seconds', 'route_matrix.json'), 'route_matrix.json.anchor_to_anchor_seconds');
		return value as RouteMatrix;
	}

	const routing = requireRecord(requireKey(matrix, 'routing', 'route_matrix.json'), 'route_matrix.json.routing');
	requireString(requireKey(routing, 'source', 'route_matrix.json.routing'), 'route_matrix.json.routing.source');
	const thresholds = requireRecord(
		requireKey(routing, 'snap_thresholds_m', 'route_matrix.json.routing'),
		'route_matrix.json.routing.snap_thresholds_m',
	);
	const good = requireFiniteNumber(requireKey(thresholds, 'good', 'route_matrix.json.routing.snap_thresholds_m'), 'route_matrix.json.routing.snap_thresholds_m.good', 0);
	const placeMax = requireFiniteNumber(requireKey(thresholds, 'place_max', 'route_matrix.json.routing.snap_thresholds_m'), 'route_matrix.json.routing.snap_thresholds_m.place_max', 0);
	const anchorMax = requireFiniteNumber(requireKey(thresholds, 'anchor_max', 'route_matrix.json.routing.snap_thresholds_m'), 'route_matrix.json.routing.snap_thresholds_m.anchor_max', 0);
	if (good > 40) throw new Error('route_matrix.json good snap threshold must be <= 40m');
	if (placeMax > 100) throw new Error('route_matrix.json place snap threshold must be <= 100m');
	if (anchorMax > 100) throw new Error('route_matrix.json anchor snap threshold must be <= 100m');
	if (good > placeMax || good > anchorMax) throw new Error('route_matrix.json good snap threshold must not exceed max thresholds');

	if (matrix.unsupported_anchors !== undefined) validateAnchorMap(matrix.unsupported_anchors, 'route_matrix.json.unsupported_anchors');
	validatePlaceSnaps(requireKey(matrix, 'place_snaps', 'route_matrix.json'), 'route_matrix.json.place_snaps');
	validateRouteLegMatrix(requireKey(matrix, 'anchor_to_place', 'route_matrix.json'), 'route_matrix.json.anchor_to_place');
	validateRouteLegMatrix(requireKey(matrix, 'place_to_anchor', 'route_matrix.json'), 'route_matrix.json.place_to_anchor');
	validateRouteLegMatrix(requireKey(matrix, 'anchor_to_anchor', 'route_matrix.json'), 'route_matrix.json.anchor_to_anchor');
	return value as RouteMatrix;
}

export function validateCollections(value: unknown): Collection[] {
	if (!Array.isArray(value)) throw new Error('collections.json must contain an array');
	return value.map((entry, index) => {
		const item = requireRecord(entry, `collections.json item ${index}`);
		for (const key of ['id', 'slug', 'title', 'description', 'researchDate'] as const) {
			requireString(requireKey(item, key, `collections.json item ${index}`), `collections.json item ${index}.${key}`);
		}
		requireInteger(requireKey(item, 'evidenceCount', `collections.json item ${index}`), `collections.json item ${index}.evidenceCount`, 0);
		requireStringArray(requireKey(item, 'sourceUrls', `collections.json item ${index}`), `collections.json item ${index}.sourceUrls`);
		requireStringArray(requireKey(item, 'placeIds', `collections.json item ${index}`), `collections.json item ${index}.placeIds`);
		const coverVariant = requireString(requireKey(item, 'coverVariant', `collections.json item ${index}`), `collections.json item ${index}.coverVariant`);
		if (!['sun', 'leaf', 'forest'].includes(coverVariant)) throw new Error(`collections.json item ${index}.coverVariant is invalid`);
		return entry as Collection;
	});
}

export function validateZones(value: unknown): FoodZone[] {
	if (!Array.isArray(value)) throw new Error('zones.json must contain an array');
	return value.map((entry, index) => {
		const item = requireRecord(entry, `zones.json item ${index}`);
		for (const key of ['id', 'name', 'shortName', 'description'] as const) {
			requireString(requireKey(item, key, `zones.json item ${index}`), `zones.json item ${index}.${key}`);
		}
		requireFiniteNumber(requireKey(item, 'priority', `zones.json item ${index}`), `zones.json item ${index}.priority`);
		const placeIds = requireStringArray(requireKey(item, 'placeIds', `zones.json item ${index}`), `zones.json item ${index}.placeIds`);
		const placeCount = requireInteger(requireKey(item, 'placeCount', `zones.json item ${index}`), `zones.json item ${index}.placeCount`, 0);
		if (placeCount !== placeIds.length) throw new Error(`zones.json item ${index}.placeCount must match placeIds.length`);
		if (item.bounds !== null) {
			const bounds = requireRecord(item.bounds, `zones.json item ${index}.bounds`);
			const minLat = validateLatitude(requireKey(bounds, 'minLat', `zones.json item ${index}.bounds`), `zones.json item ${index}.bounds.minLat`);
			const maxLat = validateLatitude(requireKey(bounds, 'maxLat', `zones.json item ${index}.bounds`), `zones.json item ${index}.bounds.maxLat`);
			const minLon = validateLongitude(requireKey(bounds, 'minLon', `zones.json item ${index}.bounds`), `zones.json item ${index}.bounds.minLon`);
			const maxLon = validateLongitude(requireKey(bounds, 'maxLon', `zones.json item ${index}.bounds`), `zones.json item ${index}.bounds.maxLon`);
			if (minLat > maxLat || minLon > maxLon) throw new Error(`zones.json item ${index}.bounds has inverted bounds`);
		}
		return entry as FoodZone;
	});
}

export function validateFreshie(value: unknown): FreshieData {
	const data = requireRecord(value, 'freshie.json');
	requireFiniteNumber(requireKey(data, 'version', 'freshie.json'), 'freshie.json.version', 1);
	for (const key of ['researchDate', 'intro', 'starterCollectionId', 'sourceNote'] as const) {
		requireString(requireKey(data, key, 'freshie.json'), `freshie.json.${key}`);
	}

	if (!Array.isArray(data.situations)) throw new Error('freshie.json.situations must contain an array');
	data.situations.forEach((raw, index) => {
		const item = requireRecord(raw, `freshie.json.situations[${index}]`);
		for (const key of ['id', 'title', 'description', 'explore_query'] as const) {
			requireString(requireKey(item, key, `freshie.json.situations[${index}]`), `freshie.json.situations[${index}].${key}`);
		}
	});

	if (!Array.isArray(data.glossary)) throw new Error('freshie.json.glossary must contain an array');
	data.glossary.forEach((raw, index) => {
		const item = requireRecord(raw, `freshie.json.glossary[${index}]`);
		requireString(requireKey(item, 'term', `freshie.json.glossary[${index}]`), `freshie.json.glossary[${index}].term`);
		requireString(requireKey(item, 'definition', `freshie.json.glossary[${index}]`), `freshie.json.glossary[${index}].definition`);
	});

	if (!Array.isArray(data.mentions)) throw new Error('freshie.json.mentions must contain an array');
	data.mentions.forEach((raw, index) => {
		const item = requireRecord(raw, `freshie.json.mentions[${index}]`);
		for (const key of ['placeId', 'sourceId', 'claimType', 'summary'] as const) {
			requireString(requireKey(item, key, `freshie.json.mentions[${index}]`), `freshie.json.mentions[${index}].${key}`);
		}
	});

	const sources = requireRecord(requireKey(data, 'sources', 'freshie.json'), 'freshie.json.sources');
	for (const [sourceId, raw] of Object.entries(sources)) {
		const source = requireRecord(raw, `freshie.json.sources.${sourceId}`);
		for (const key of ['name', 'type', 'url', 'accessLevel', 'authorityLevel'] as const) {
			requireString(requireKey(source, key, `freshie.json.sources.${sourceId}`), `freshie.json.sources.${sourceId}.${key}`);
		}
		// Some official sources do not publish a machine-readable date; the
		// schema intentionally permits an empty publishedAt string.
		requireString(requireKey(source, 'publishedAt', `freshie.json.sources.${sourceId}`), `freshie.json.sources.${sourceId}.publishedAt`, true);
	}

	return value as FreshieData;
}
