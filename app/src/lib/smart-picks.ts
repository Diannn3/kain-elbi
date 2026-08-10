import { categoryAffinity } from './category-affinity';
import { evaluatePlaceAvailability, openWindowSeconds } from './place-availability';
import { anchorToAnchorLeg, anchorToPlaceLeg, placeToAnchorLeg, resolveAnchorId } from './routing';
import {
	MINIMUM_STOP_SECONDS,
	SAFETY_BUFFER_SECONDS,
	SMART_PICK_POLICY,
} from './smart-picks-policy';
import type { Place, RouteMatrix, SearchContext, SmartPick } from './types';

export { MINIMUM_STOP_SECONDS, SAFETY_BUFFER_SECONDS } from './smart-picks-policy';

export class UnsupportedRouteContextError extends Error {
	constructor(kind: 'origin' | 'destination') {
		super(
			kind === 'origin'
				? 'This saved route is no longer supported by the current campus data. Choose your starting building again.'
				: 'This next-class building is no longer supported by the current campus data. Choose your route again.',
		);
		this.name = 'UnsupportedRouteContextError';
	}
}

function minutes(seconds: number): number {
	return Math.round(seconds / 60);
}

function resolveSupportedContext(matrix: RouteMatrix, searchContext: SearchContext): SearchContext {
	const originId = resolveAnchorId(matrix, searchContext.originId);
	if (!originId) throw new UnsupportedRouteContextError('origin');

	let destinationId: string | undefined;
	if (searchContext.destinationId) {
		destinationId = resolveAnchorId(matrix, searchContext.destinationId);
		if (!destinationId) throw new UnsupportedRouteContextError('destination');
	}

	return {
		...searchContext,
		originId,
		destinationId,
	};
}

export function rankSmartPicks(
	places: Place[],
	matrix: RouteMatrix,
	searchContext: SearchContext,
	now = new Date(),
): SmartPick[] {
	const context = resolveSupportedContext(matrix, searchContext);
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
		const plannedStopSeconds = breakSeconds - totalWalkSeconds - SAFETY_BUFFER_SECONDS;
		if (plannedStopSeconds < MINIMUM_STOP_SECONDS) return [];

		const arrival = new Date(now.getTime() + (context.approachSeconds + originToPlace) * 1000);
		const plannedDeparture = new Date(arrival.getTime() + plannedStopSeconds * 1000);
		const availability = evaluatePlaceAvailability(place, arrival, plannedDeparture);
		if (availability === 'closed_at_arrival') return [];

		let timeRemainingSeconds = plannedStopSeconds;
		if (availability === 'closes_during_stop') {
			const knownOpenSeconds = openWindowSeconds(place, arrival, plannedDeparture);
			if (knownOpenSeconds !== undefined) timeRemainingSeconds = Math.min(timeRemainingSeconds, knownOpenSeconds);
			if (timeRemainingSeconds < MINIMUM_STOP_SECONDS) return [];
		}
		const departure = new Date(arrival.getTime() + timeRemainingSeconds * 1000);

		const routeFit = Math.min(timeRemainingSeconds / SMART_PICK_POLICY.time.fullRouteFitSeconds, 1)
			* SMART_PICK_POLICY.score.routeFitMax;
		let efficiency = 0;
		let detourSeconds: number | undefined;
		let explanation: string;
		const stopWindowPhrase = availability === 'closes_during_stop'
			? 'before the listed closing time'
			: 'for your stop';

		if (context.destinationId && directWalk !== undefined) {
			const routedWalk = originToPlace + placeToDestination;
			const ratio = directWalk > 0 ? routedWalk / directWalk : 1;
			efficiency = ratio <= SMART_PICK_POLICY.score.efficientRouteRatio
				? SMART_PICK_POLICY.score.efficiencyMax
				: ratio <= SMART_PICK_POLICY.score.acceptableRouteRatio
					? SMART_PICK_POLICY.score.acceptableEfficiency
					: 0;
			detourSeconds = Math.max(0, routedWalk - directWalk);
			explanation = `Adds a ${minutes(detourSeconds)}-minute detour · leaves ${minutes(timeRemainingSeconds)} minutes ${stopWindowPhrase}.`;
		} else {
			efficiency = usableTravelBudget > 0
				? Math.max(0, 1 - originToPlace / usableTravelBudget) * SMART_PICK_POLICY.score.efficiencyMax
				: 0;
			explanation = `${minutes(originToPlace)}-minute walk · leaves ${minutes(timeRemainingSeconds)} minutes ${stopWindowPhrase} · return trip not included.`;
		}

		const categoryScore = categoryAffinity(context.preferredCategory, place.category);
		const confidenceScore =
			(place.independentSourceCount > 1 ? SMART_PICK_POLICY.score.multipleSourcesConfidence : 0)
			+ (place.hasParseableHours ? SMART_PICK_POLICY.score.parseableHoursConfidence : 0);
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
