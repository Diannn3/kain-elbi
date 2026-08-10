import type { Place } from './types';

export type ExploreHoursStatus = 'open' | 'closing' | 'closed' | 'unknown';

export async function evaluateExploreHours(
	places: Place[],
	now = new Date(),
	closingSoonMinutes = 60,
): Promise<Record<string, ExploreHoursStatus>> {
	const { default: OpeningHours } = await import('opening_hours');
	const result: Record<string, ExploreHoursStatus> = {};
	const deadline = new Date(now.getTime() + closingSoonMinutes * 60_000);

	for (const place of places) {
		if (!place.openingHours) {
			result[place.id] = 'unknown';
			continue;
		}

		try {
			const parsed = new OpeningHours(place.openingHours, {
				lat: place.lat,
				lon: place.lon,
				address: { country_code: 'ph', state: 'Laguna' },
			});

			if (!parsed.getState(now)) {
				result[place.id] = 'closed';
				continue;
			}

			const nextChange = parsed.getNextChange(now, deadline);
			if (nextChange) {
				const stateAfterChange = parsed.getState(new Date(nextChange.getTime() + 1_000));
				result[place.id] = stateAfterChange ? 'open' : 'closing';
			} else {
				result[place.id] = 'open';
			}
		} catch {
			result[place.id] = 'unknown';
		}
	}

	return result;
}

export function exploreHoursLabel(status: ExploreHoursStatus): string {
	switch (status) {
		case 'open': return 'Open now';
		case 'closing': return 'Closing soon';
		case 'closed': return 'Closed now';
		default: return 'Hours unknown';
	}
}
