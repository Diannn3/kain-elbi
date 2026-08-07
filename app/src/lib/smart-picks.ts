import { categoryAffinity } from './category-affinity';
import { evaluatePlaceAvailability } from './place-availability';
import { anchorToAnchorLeg, anchorToPlaceLeg, placeToAnchorLeg, resolveSearchContext } from './routing';
import type { Place, RouteMatrix, SearchContext, SmartPick } from './types';

export const MINIMUM_STOP_SECONDS = 15 * 60;
export const SAFETY_BUFFER_SECONDS = 5 * 60;

function minutes(seconds: number): number {
	return Math.round(seconds / 60);
}

export function rankSmartPicks(
	places: Place[],
	matrix: RouteMatrix,
	searchContext: SearchContext,
	now = new Date(),
): SmartPick[] {
	const context = resolveSearchContext(matrix, searchContext);
	const breakSeconds = context.breakMinutes * 60;
	const usableTravelBudget = breakSeconds - MINIMUM_STOP_SECONDS - SAFETY_BUFFER_SECONDS;

	const picks = places.flatMap((place): SmartPick[] => {
		if (place.recordStatus !== 'candidate') return [];
		const originLeg = anchorToPlaceLeg(matrix, context.originId, place.id);
		if (!originLeg) return [];
		const originToPlace = originLeg.seconds;

		let placeToDestination = 0;
		let directWalk: number | undefined;
		if (context.destinationId) {
			const destinationLeg = placeToAnchorLeg(matrix, place.id, context.destinationId);
			const directLeg = anchorToAnchorLeg(matrix, context.originId, context.destinationId);
			if (!destinationLeg || !directLeg) return [];
			placeToDestination = destinationLeg.seconds;
			directWalk = directLeg.seconds;
		}

		const totalWalkSeconds = context.approachSeconds + originToPlace + placeToDestination;
		const timeRemainingSeconds = breakSeconds - totalWalkSeconds - SAFETY_BUFFER_SECONDS;
		if (timeRemainingSeconds < MINIMUM_STOP_SECONDS) return [];

		const arrival = new Date(now.getTime() + (context.approachSeconds + originToPlace) * 1000);
		const departure = new Date(arrival.getTime() + timeRemainingSeconds * 1000);
		const availability = evaluatePlaceAvailability(place, arrival, departure);
		if (availability === 'closed_at_arrival') return [];

		const routeFit = Math.min(timeRemainingSeconds / (30 * 60), 1) * 40;
		let efficiency = 0;
		let detourSeconds: number | undefined;
		let explanation: string;

		if (context.destinationId && directWalk !== undefined) {
			const routedWalk = originToPlace + placeToDestination;
			const ratio = directWalk > 0 ? routedWalk / directWalk : 1;
			efficiency = ratio <= 1.1 ? 30 : ratio <= 1.5 ? 15 : 0;
			detourSeconds = Math.max(0, routedWalk - directWalk);
			explanation = `Adds a ${minutes(detourSeconds)}-minute detour · leaves ${minutes(timeRemainingSeconds)} minutes for your stop.`;
		} else {
			efficiency = usableTravelBudget > 0
				? Math.max(0, 1 - originToPlace / usableTravelBudget) * 30
				: 0;
			explanation = `${minutes(originToPlace)}-minute walk · leaves ${minutes(timeRemainingSeconds)} minutes · return trip not included.`;
		}

		const categoryScore = categoryAffinity(context.preferredCategory, place.category);
		const confidenceScore =
			(place.independentSourceCount > 1 ? 10 : 0) + (place.hasParseableHours ? 5 : 0);
		const scoreBreakdown = {
			routeFit,
			efficiency,
			category: categoryScore,
			confidence: confidenceScore,
		};

		return [{
			place,
			timeRemainingSeconds,
			totalWalkSeconds,
			walkToPlaceSeconds: originToPlace,
			walkFromPlaceSeconds: placeToDestination,
			directWalkSeconds: directWalk,
			detourSeconds,
			arrivalAt: arrival.toISOString(),
			estimatedDepartureAt: departure.toISOString(),
			availability,
			score: Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0),
			scoreBreakdown,
			explanation,
			confidence: place.confidenceLabel,
		}];
	});

	return picks.sort(
		(a, b) =>
			b.score - a.score ||
			a.totalWalkSeconds - b.totalWalkSeconds ||
			b.place.independentSourceCount - a.place.independentSourceCount ||
			a.place.name.localeCompare(b.place.name),
	);
}
