import type { MealTag, Place, PlaceEnrichmentData, PlaceEnrichmentEntry, PlacePrice } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validDate(value: unknown): boolean {
	return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function normalizeAliases(value: unknown, placeId: string): string[] {
	if (value === undefined) return [];
	if (!Array.isArray(value)) throw new Error(`place_enrichment.json ${placeId} aliases must be an array`);

	const aliases: string[] = [];
	const seen = new Set<string>();

	for (const item of value) {
		if (typeof item !== 'string' || !item.trim()) {
			throw new Error(`place_enrichment.json ${placeId} contains an empty alias`);
		}
		const clean = item.trim().replace(/\s+/g, ' ');
		const key = clean.toLowerCase();
		if (!seen.has(key)) {
			seen.add(key);
			aliases.push(clean);
		}
	}

	return aliases;
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

const MEAL_TAGS = new Set<MealTag>(['rice-meal', 'snack', 'coffee', 'dessert', 'heavy-meal', 'quick-meal', 'bakery', 'drinks']);

function validateMealTags(value: unknown, placeId: string): PlaceEnrichmentEntry['mealTags'] {
	if (value === undefined) return undefined;
	if (!Array.isArray(value)) throw new Error(`place_enrichment.json ${placeId} mealTags must be an array`);
	const tags = [...new Set(value)];
	if (tags.some((tag) => typeof tag !== 'string' || !MEAL_TAGS.has(tag as MealTag))) throw new Error(`place_enrichment.json ${placeId} contains an invalid mealTag`);
	return tags as NonNullable<PlaceEnrichmentEntry['mealTags']>;
}

function normalizeDishTags(value: unknown, placeId: string, index: number): string[] | undefined {
	if (value === undefined) return undefined;
	if (!Array.isArray(value)) throw new Error(`place_enrichment.json ${placeId} dish ${index} tags must be an array`);
	const tags: string[] = [];
	const seen = new Set<string>();
	for (const raw of value) {
		if (typeof raw !== 'string' || !raw.trim()) throw new Error(`place_enrichment.json ${placeId} dish ${index} contains an invalid tag`);
		const clean = raw.trim().slice(0, 80);
		const key = clean.toLocaleLowerCase();
		if (!seen.has(key)) { seen.add(key); tags.push(clean); }
	}
	return tags;
}

function validateDishes(value: unknown, placeId: string): PlaceEnrichmentEntry['dishes'] {
	if (value === undefined) return undefined;
	if (!Array.isArray(value)) throw new Error(`place_enrichment.json ${placeId} dishes must be an array`);
	const seenNames = new Set<string>();
	return value.map((item, index) => {
		if (!isRecord(item) || typeof item.name !== 'string' || !item.name.trim()) throw new Error(`place_enrichment.json ${placeId} dish ${index} needs a name`);
		const name = item.name.trim().slice(0, 120);
		const nameKey = name.toLocaleLowerCase();
		if (seenNames.has(nameKey)) throw new Error(`place_enrichment.json ${placeId} contains duplicate dish ${name}`);
		seenNames.add(nameKey);
		const pricePhp = item.pricePhp === undefined ? undefined : Number(item.pricePhp);
		if (pricePhp !== undefined && (!Number.isInteger(pricePhp) || pricePhp <= 0 || pricePhp > 10_000)) throw new Error(`place_enrichment.json ${placeId} dish ${index} has invalid pricePhp`);
		const tags = normalizeDishTags(item.tags, placeId, index);
		if (item.verifiedAt !== undefined && !validDate(item.verifiedAt)) throw new Error(`place_enrichment.json ${placeId} dish ${index} verifiedAt must use YYYY-MM-DD`);
		return { name, ...(pricePhp === undefined ? {} : { pricePhp }), ...(tags?.length ? { tags } : {}), ...(item.verifiedAt === undefined ? {} : { verifiedAt: item.verifiedAt as string }) };
	});
}

function validateVerification(value: unknown, placeId: string): PlaceEnrichmentEntry['verification'] {
	if (value === undefined) return undefined;
	if (!isRecord(value)) throw new Error(`place_enrichment.json ${placeId} verification must be an object`);
	const fields = ['hours', 'price', 'menu', 'payment', 'location'] as const;
	const sources = new Set(['community', 'shop', 'editorial', 'public_source']);
	const result: NonNullable<PlaceEnrichmentEntry['verification']> = {};
	for (const field of fields) {
		const raw = value[field];
		if (raw === undefined) continue;
		if (!isRecord(raw) || typeof raw.source !== 'string' || !sources.has(raw.source) || !validDate(raw.verifiedAt)) {
			throw new Error(`place_enrichment.json ${placeId} verification.${field} is invalid`);
		}
		result[field] = { verifiedAt: raw.verifiedAt as string, source: raw.source as any };
	}
	return Object.keys(result).length ? result : undefined;
}

function validateShopVerification(value: unknown, placeId: string): PlaceEnrichmentEntry['shopVerification'] {
	if (value === undefined) return undefined;
	if (!isRecord(value) || value.status !== 'verified' || !validDate(value.verifiedAt)) {
		throw new Error(`place_enrichment.json ${placeId} shopVerification is invalid`);
	}
	const method = value.method;
	if (method !== 'owner_submission' && method !== 'manual') {
		throw new Error(`place_enrichment.json ${placeId} shopVerification method is invalid`);
	}
	const displayName = typeof value.displayName === 'string' && value.displayName.trim() ? value.displayName.trim().slice(0, 160) : undefined;
	return { status: 'verified', verifiedAt: value.verifiedAt as string, method, ...(displayName ? { displayName } : {}) };
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
		const mealTags = validateMealTags(raw.mealTags, placeId);
		const dishes = validateDishes(raw.dishes, placeId);
		const verification = validateVerification(raw.verification, placeId);
		const shopVerification = validateShopVerification(raw.shopVerification, placeId);

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
			...(mealTags === undefined ? {} : { mealTags }),
			...(dishes === undefined ? {} : { dishes }),
			...(verification === undefined ? {} : { verification }),
			...(shopVerification === undefined ? {} : { shopVerification }),
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
			mealTags: extra?.mealTags ?? [],
			dishes: extra?.dishes ?? [],
			verification: extra?.verification,
			shopVerification: extra?.shopVerification,
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
