import OpeningHours from 'opening_hours';
import type { AvailabilityStatus, Place } from './types';

export function evaluatePlaceAvailability(
	place: Pick<Place, 'openingHours' | 'lat' | 'lon'>,
	arrival: Date,
	departure: Date,
): AvailabilityStatus {
	if (!place.openingHours) return 'unknown';
	try {
		const parsed = new OpeningHours(place.openingHours, {
			lat: place.lat,
			lon: place.lon,
			address: { country_code: 'ph', state: 'Laguna' },
		});
		const openAtArrival = parsed.getState(arrival);
		if (!openAtArrival) return 'closed_at_arrival';
		return parsed.getState(departure) ? 'open_at_arrival' : 'closes_during_stop';
	} catch {
		return 'unknown';
	}
}

export function availabilityLabel(status: AvailabilityStatus): string {
	switch (status) {
		case 'open_at_arrival': return 'Open at estimated arrival · based on source-listed hours';
		case 'closes_during_stop': return 'May close during your stop · based on source-listed hours';
		case 'closed_at_arrival': return 'Closed at estimated arrival · based on source-listed hours';
		default: return 'Hours unavailable or need checking';
	}
}
