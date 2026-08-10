import type {
	CommunityImpactData,
	CommunityImpactMetrics,
	FoodEvent,
	FoodEventsData,
} from '../types';

const MONTH = /^\d{4}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseDate(value: unknown, label: string): string {
	if (typeof value !== 'string' || !value.trim()) {
		throw new Error(`${label} must be a non-empty ISO date-time string`);
	}
	const parsed = new Date(value);
	if (!Number.isFinite(parsed.getTime())) {
		throw new Error(`${label} must be a valid ISO date-time string`);
	}
	return value;
}

function optionalCoordinate(value: unknown, label: string, min: number, max: number): number | undefined {
	if (value === undefined) return undefined;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
		throw new Error(`${label} is outside its valid coordinate range`);
	}
	return parsed;
}

function normalizeStringArray(value: unknown, label: string): string[] {
	if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
	const result: string[] = [];
	const seen = new Set<string>();
	for (const item of value) {
		if (typeof item !== 'string' || !item.trim()) throw new Error(`${label} contains an invalid item`);
		const clean = item.trim();
		const key = clean.toLocaleLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		result.push(clean);
	}
	return result;
}

export function validateFoodEvents(value: unknown): FoodEventsData {
	if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.events)) {
		throw new Error('events.json must use version 1 and contain an events array');
	}

	const ids = new Set<string>();
	const events: FoodEvent[] = value.events.map((raw, index) => {
		if (!isRecord(raw)) throw new Error(`events.json item ${index} must be an object`);
		const id = typeof raw.id === 'string' ? raw.id.trim() : '';
		const title = typeof raw.title === 'string' ? raw.title.trim() : '';
		const description = typeof raw.description === 'string' ? raw.description.trim() : '';
		const locationName = typeof raw.locationName === 'string' ? raw.locationName.trim() : '';
		const sourceUrl = typeof raw.sourceUrl === 'string' ? raw.sourceUrl.trim() : '';
		const organizer = typeof raw.organizer === 'string' && raw.organizer.trim() ? raw.organizer.trim() : undefined;
		const status = raw.status;

		if (!id || !/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error(`events.json item ${index} has an invalid id`);
		if (ids.has(id)) throw new Error(`events.json contains duplicate event id ${id}`);
		ids.add(id);
		if (!title) throw new Error(`events.json ${id} is missing title`);
		if (!description) throw new Error(`events.json ${id} is missing description`);
		if (!locationName) throw new Error(`events.json ${id} is missing locationName`);
		if (status !== 'scheduled' && status !== 'cancelled') throw new Error(`events.json ${id} status must be scheduled or cancelled`);

		const startAt = parseDate(raw.startAt, `events.json ${id} startAt`);
		const endAt = parseDate(raw.endAt, `events.json ${id} endAt`);
		if (new Date(endAt).getTime() <= new Date(startAt).getTime()) throw new Error(`events.json ${id} endAt must be after startAt`);

		let parsedUrl: URL;
		try { parsedUrl = new URL(sourceUrl); }
		catch { throw new Error(`events.json ${id} sourceUrl must be a valid URL`); }
		if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') throw new Error(`events.json ${id} sourceUrl must use http or https`);

		const lat = optionalCoordinate(raw.lat, `events.json ${id} lat`, -90, 90);
		const lon = optionalCoordinate(raw.lon, `events.json ${id} lon`, -180, 180);
		if ((lat === undefined) !== (lon === undefined)) throw new Error(`events.json ${id} must provide both lat and lon or neither`);

		return {
			id, title, description, startAt, endAt, locationName,
			...(lat === undefined ? {} : { lat, lon: lon! }),
			...(organizer === undefined ? {} : { organizer }),
			foodTags: normalizeStringArray(raw.foodTags ?? [], `events.json ${id} foodTags`),
			sourceUrl, status,
		};
	});

	return { version: 1, events };
}

function metric(value: unknown, label: string): number {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${label} must be a non-negative integer`);
	return parsed;
}

export function validateCommunityImpact(value: unknown): CommunityImpactData {
	if (!isRecord(value) || value.version !== 1 || !isRecord(value.metrics)) {
		throw new Error('community_impact.json must use version 1 and contain metrics');
	}
	if (typeof value.month !== 'string' || !MONTH.test(value.month)) throw new Error('community_impact.json month must use YYYY-MM');
	if (value.generatedAt !== null && (typeof value.generatedAt !== 'string' || !Number.isFinite(new Date(value.generatedAt).getTime()))) {
		throw new Error('community_impact.json generatedAt must be null or a valid ISO date-time');
	}
	const metrics: CommunityImpactMetrics = {
		placesAdded: metric(value.metrics.placesAdded, 'placesAdded'),
		placesCorrected: metric(value.metrics.placesCorrected, 'placesCorrected'),
		hoursChecked: metric(value.metrics.hoursChecked, 'hoursChecked'),
		eventsPublished: metric(value.metrics.eventsPublished, 'eventsPublished'),
	};
	return { version: 1, month: value.month, generatedAt: value.generatedAt as string | null, metrics };
}

export function activeFoodEvents(events: FoodEvent[], now = new Date()): FoodEvent[] {
	const time = now.getTime();
	return events
		.filter((event) =>
			event.status === 'scheduled'
			&& new Date(event.startAt).getTime() <= time
			&& time <= new Date(event.endAt).getTime()
		)
		.sort((a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime());
}

export function upcomingFoodEvents(events: FoodEvent[], now = new Date(), windowDays = 7): FoodEvent[] {
	const time = now.getTime();
	const limit = time + windowDays * 86_400_000;
	return events
		.filter((event) => {
			const start = new Date(event.startAt).getTime();
			return event.status === 'scheduled' && start > time && start <= limit;
		})
		.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

export function hasCommunityImpact(data: CommunityImpactData): boolean {
	return Object.values(data.metrics).some((value) => value > 0);
}
