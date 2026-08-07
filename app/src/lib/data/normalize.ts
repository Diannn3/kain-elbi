import type {
	Category,
	ConfidenceLabel,
	Place,
	PlaceSource,
	RecordStatus,
} from '../types';

interface RawPlace {
	id?: unknown;
	name?: unknown;
	lat?: unknown;
	lon?: unknown;
	category?: unknown;
	cuisine?: unknown;
	phone?: unknown;
	website?: unknown;
	opening_hours?: unknown;
	status?: unknown;
	sources?: unknown;
	independent_source_count?: unknown;
	overture_confidence?: unknown;
	operating_status?: unknown;
}

const CATEGORY_MAP: Record<string, Category> = {
	cafe: 'cafe',
	restaurant: 'restaurant',
	fast_food: 'fast_food',
	food_court: 'food_court',
	bakery: 'bakery_deli',
	ice_cream: 'bakery_deli',
	confectionery: 'bakery_deli',
	bakery_deli: 'bakery_deli',
	kiosk_stall: 'kiosk_stall',
};

function asNullableString(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeCuisine(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
	}
	if (typeof value === 'string' && value.trim()) {
		return value
			.split(/[;,]/)
			.map((item) => item.trim())
			.filter(Boolean);
	}
	return [];
}

function normalizeSources(value: unknown): PlaceSource[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((entry) => {
		if (!entry || typeof entry !== 'object') return [];
		const source = 'source' in entry ? asNullableString(entry.source) : null;
		const sourceId = 'source_id' in entry ? asNullableString(entry.source_id) : null;
		return source && sourceId ? [{ source, sourceId }] : [];
	});
}

export function hasParseableOpeningHours(value: string | null): boolean {
	if (!value) return false;
	return value === '24/7' || /^(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?(?:,(?:Mo|Tu|We|Th|Fr|Sa|Su))*\s+\d{2}:\d{2}-\d{2}:\d{2}(?:;|$)/.test(value);
}

function confidenceLabel(sources: PlaceSource[], openingHours: string | null): ConfidenceLabel {
	if (new Set(sources.map((source) => source.source.toLowerCase())).size > 1) return 'Multiple sources agree';
	if (openingHours) return 'Hours listed';
	return 'Limited place information';
}

export function normalizePlaces(input: unknown[]): Place[] {
	return input.flatMap((entry) => {
		if (!entry || typeof entry !== 'object') return [];
		const raw = entry as RawPlace;
		const id = asNullableString(raw.id);
		const name = asNullableString(raw.name);
		const lat = typeof raw.lat === 'number' ? raw.lat : Number.NaN;
		const lon = typeof raw.lon === 'number' ? raw.lon : Number.NaN;

		if (!id || !name || !Number.isFinite(lat) || !Number.isFinite(lon)) return [];
		if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return [];

		const rawStatus = asNullableString(raw.status);
		const recordStatus: RecordStatus =
			rawStatus === 'closed' || rawStatus === 'unusable' ? rawStatus : 'candidate';
		const categoryKey = asNullableString(raw.category)?.toLowerCase() ?? '';
		const openingHours = asNullableString(raw.opening_hours);
		const sources = normalizeSources(raw.sources);
		const independentSourceCount = typeof raw.independent_source_count === 'number'
			? Math.max(0, Math.floor(raw.independent_source_count))
			: new Set(sources.map((source) => source.source.toLowerCase())).size;
		const overtureConfidence = typeof raw.overture_confidence === 'number' && Number.isFinite(raw.overture_confidence)
			? raw.overture_confidence
			: null;

		return [
			{
				id,
				name,
				lat,
				lon,
				category: CATEGORY_MAP[categoryKey] ?? 'other',
				cuisine: normalizeCuisine(raw.cuisine),
				phone: asNullableString(raw.phone),
				website: asNullableString(raw.website),
				openingHours,
				recordStatus,
				sources,
				independentSourceCount,
				overtureConfidence,
				operatingStatus: asNullableString(raw.operating_status),
				confidenceLabel: confidenceLabel(sources, openingHours),
				hasParseableHours: hasParseableOpeningHours(openingHours),
			},
		];
	});
}
