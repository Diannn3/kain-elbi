import type {
	Place,
	PlaceEnrichmentData,
	PlaceEnrichmentEntry,
	PlacePrice,
} from '../types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validDate(value: unknown): value is string {
	if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
	const parsed = new Date(`${value}T00:00:00Z`);
	return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function normalizeAliases(value: unknown, placeId: string): string[] {
	if (value === undefined) return [];
	if (!Array.isArray(value)) throw new Error(`place_enrichment.json ${placeId} aliases must be an array`);

	const result: string[] = [];
	const seen = new Set<string>();
	for (const alias of value) {
		if (typeof alias !== 'string' || !alias.trim()) {
			throw new Error(`place_enrichment.json ${placeId} contains an invalid alias`);
		}
		const clean = alias.trim();
		const key = clean.toLocaleLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		result.push(clean);
	}
	return result;
}

function validatePrice(value: unknown, placeId: string): PlacePrice | undefined {
	if (value === undefined) return undefined;
	if (!isRecord(value)) throw new Error(`place_enrichment.json ${placeId} price must contain an object`);

	const mealLowPhp = Number(value.mealLowPhp);
	const mealHighPhp = value.mealHighPhp === undefined ? undefined : Number(value.mealHighPhp);
	const verifiedAt = value.verifiedAt;

	if (!Number.isInteger(mealLowPhp) || mealLowPhp <= 0 || mealLowPhp > 10_000) {
		throw new Error(`place_enrichment.json ${placeId} mealLowPhp must be a positive integer`);
	}
	if (
		mealHighPhp !== undefined
		&& (!Number.isInteger(mealHighPhp) || mealHighPhp < mealLowPhp || mealHighPhp > 10_000)
	) {
		throw new Error(`place_enrichment.json ${placeId} mealHighPhp must be >= mealLowPhp`);
	}
	if (!validDate(verifiedAt)) {
		throw new Error(`place_enrichment.json ${placeId} price verifiedAt must use YYYY-MM-DD`);
	}

	return { mealLowPhp, ...(mealHighPhp === undefined ? {} : { mealHighPhp }), verifiedAt };
}

export function validatePlaceEnrichment(value: unknown): PlaceEnrichmentData {
	if (!isRecord(value)) throw new Error('place_enrichment.json must contain an object');
	if (value.version !== 1) throw new Error('place_enrichment.json must use version 1');
	if (!isRecord(value.places)) throw new Error('place_enrichment.json places must contain an object');

	const places: Record<string, PlaceEnrichmentEntry> = {};
	for (const [placeId, raw] of Object.entries(value.places)) {
		if (!placeId.trim() || !isRecord(raw)) {
			throw new Error('place_enrichment.json contains an invalid place entry');
		}

		const aliases = normalizeAliases(raw.aliases, placeId);
		const addedAt = raw.addedAt;
		const lastReviewedAt = raw.lastReviewedAt;
		const price = validatePrice(raw.price, placeId);

		if (addedAt !== undefined && !validDate(addedAt)) {
			throw new Error(`place_enrichment.json ${placeId} addedAt must use YYYY-MM-DD`);
		}
		if (lastReviewedAt !== undefined && !validDate(lastReviewedAt)) {
			throw new Error(`place_enrichment.json ${placeId} lastReviewedAt must use YYYY-MM-DD`);
		}

		places[placeId] = {
			aliases,
			...(addedAt === undefined ? {} : { addedAt }),
			...(lastReviewedAt === undefined ? {} : { lastReviewedAt }),
			...(price === undefined ? {} : { price }),
		};
	}

	return { version: 1, places };
}

export function emptyPlaceEnrichment(): PlaceEnrichmentData {
	return { version: 1, places: {} };
}

export function mergePlaceEnrichment(
	places: Place[],
	enrichment: PlaceEnrichmentData,
	options: { strict?: boolean } = {},
): Place[] {
	const knownIds = new Set(places.map((place) => place.id));
	if (options.strict) {
		const unknown = Object.keys(enrichment.places).filter((id) => !knownIds.has(id));
		if (unknown.length) {
			throw new Error(
				`place_enrichment.json references unknown place IDs: ${unknown.slice(0, 5).join(', ')}`,
			);
		}
	}

	return places.map((place) => {
		const extra = enrichment.places[place.id];
		return {
			...place,
			aliases: extra?.aliases ?? [],
			addedAt: extra?.addedAt ?? null,
			lastReviewedAt: extra?.lastReviewedAt ?? null,
			price: extra?.price ?? null,
		};
	});
}

export function formatPriceRange(price: PlacePrice | null | undefined): string | undefined {
	if (!price) return undefined;
	if (!price.mealHighPhp || price.mealHighPhp === price.mealLowPhp) return `₱${price.mealLowPhp}`;
	return `₱${price.mealLowPhp}–₱${price.mealHighPhp}`;
}

export function placeFitsBudget(place: Pick<Place, 'price'>, budget: number): boolean {
	return Boolean(place.price && place.price.mealLowPhp <= budget);
}

export function isRecentlyAdded(
	place: Pick<Place, 'addedAt'>,
	now = new Date(),
	windowDays = 60,
): boolean {
	if (!place.addedAt) return false;
	const added = new Date(`${place.addedAt}T00:00:00Z`);
	if (!Number.isFinite(added.getTime())) return false;
	const age = now.getTime() - added.getTime();
	return age >= 0 && age <= windowDays * 86_400_000;
}
