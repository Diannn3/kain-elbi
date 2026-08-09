import OpeningHours from 'opening_hours';
import type { AvailabilityStatus, Place } from './types';

type AvailabilityPlace = Pick<Place, 'openingHours' | 'lat' | 'lon'>;

function parserFor(place: AvailabilityPlace) {
	if (!place.openingHours) return undefined;
	return new OpeningHours(place.openingHours, {
		lat: place.lat,
		lon: place.lon,
		address: { country_code: 'ph', state: 'Laguna' },
	});
}

export function evaluatePlaceAvailability(
	place: AvailabilityPlace,
	arrival: Date,
	departure: Date,
): AvailabilityStatus {
	if (!place.openingHours) return 'unknown';
	try {
		const parsed = parserFor(place);
		if (!parsed) return 'unknown';
		const openAtArrival = parsed.getState(arrival);
		if (!openAtArrival) return 'closed_at_arrival';
		return parsed.getState(departure) ? 'open_at_arrival' : 'closes_during_stop';
	} catch {
		return 'unknown';
	}
}

/**
 * Returns the number of seconds for which a place is still known-open from
 * `arrival`, capped by `plannedDeparture`. A state transition ends the
 * guaranteed-open window even if the next state is unknown rather than closed.
 */
export function openWindowSeconds(
	place: AvailabilityPlace,
	arrival: Date,
	plannedDeparture: Date,
): number | undefined {
	if (!place.openingHours) return undefined;
	try {
		const parsed = parserFor(place);
		if (!parsed || !parsed.getState(arrival)) return 0;
		const nextChange = parsed.getNextChange(arrival, plannedDeparture);
		if (!nextChange) {
			return Math.max(0, Math.floor((plannedDeparture.getTime() - arrival.getTime()) / 1000));
		}
		return Math.max(0, Math.floor((nextChange.getTime() - arrival.getTime()) / 1000));
	} catch {
		return undefined;
	}
}

export function availabilityLabel(status: AvailabilityStatus): string {
	switch (status) {
		case 'open_at_arrival': return 'Open at estimated arrival · based on source-listed hours';
		case 'closes_during_stop': return 'Closes before the full break window ends · based on source-listed hours';
		case 'closed_at_arrival': return 'Closed at estimated arrival · based on source-listed hours';
		default: return 'Hours unavailable or need checking';
	}
}
