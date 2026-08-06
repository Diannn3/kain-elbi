import type { Place, RouteMatrixV1, SearchContext, SmartPick } from './types';

export const MINIMUM_STOP_SECONDS = 15 * 60;
export const SAFETY_BUFFER_SECONDS = 5 * 60;

function minutes(seconds: number): number {
	return Math.round(seconds / 60);
}

export function rankSmartPicks(
	places: Place[],
	matrix: RouteMatrixV1,
	context: SearchContext,
): SmartPick[] {
	const breakSeconds = context.breakMinutes * 60;
	const usableTravelBudget = breakSeconds - MINIMUM_STOP_SECONDS - SAFETY_BUFFER_SECONDS;

	const picks = places.flatMap((place): SmartPick[] => {
		if (place.recordStatus !== 'candidate') return [];
		if (context.preferredCategory && place.category !== context.preferredCategory) return [];

		const originToPlace = matrix.anchor_to_place_seconds[context.originId]?.[place.id];
		if (!Number.isFinite(originToPlace)) return [];

		let placeToDestination = 0;
		let directWalk: number | undefined;
		if (context.destinationId) {
			placeToDestination =
				matrix.place_to_anchor_seconds[place.id]?.[context.destinationId] ?? Number.NaN;
			directWalk =
				matrix.anchor_to_anchor_seconds[context.originId]?.[context.destinationId] ?? Number.NaN;
			if (!Number.isFinite(placeToDestination) || !Number.isFinite(directWalk)) return [];
		}

		const totalWalkSeconds = context.approachSeconds + originToPlace + placeToDestination;
		const timeRemainingSeconds = breakSeconds - totalWalkSeconds - SAFETY_BUFFER_SECONDS;
		if (timeRemainingSeconds < MINIMUM_STOP_SECONDS) return [];

		const routeFit = Math.min(timeRemainingSeconds / (30 * 60), 1) * 40;
		let efficiency = 0;
		let detourSeconds: number | undefined;
		let explanation: string;

		if (context.destinationId && directWalk !== undefined) {
			const routedWalk = originToPlace + placeToDestination;
			const ratio = routedWalk / directWalk;
			efficiency = ratio <= 1.1 ? 30 : ratio <= 1.5 ? 15 : 0;
			detourSeconds = Math.max(0, routedWalk - directWalk);
			explanation = `Adds a ${minutes(detourSeconds)}-minute detour · leaves ${minutes(timeRemainingSeconds)} minutes for your stop.`;
		} else {
			efficiency = Math.max(0, 1 - originToPlace / usableTravelBudget) * 30;
			explanation = `${minutes(originToPlace)}-minute walk · leaves ${minutes(timeRemainingSeconds)} minutes · return trip not included.`;
		}

		const categoryScore = context.preferredCategory ? 15 : 0;
		const confidenceScore =
			(place.sources.length > 1 ? 10 : 0) + (place.hasParseableHours ? 5 : 0);

		return [
			{
				place,
				timeRemainingSeconds,
				totalWalkSeconds,
				detourSeconds,
				score: routeFit + efficiency + categoryScore + confidenceScore,
				explanation,
				confidence: place.confidenceLabel,
			},
		];
	});

	return picks.sort(
		(a, b) =>
			b.score - a.score ||
			a.totalWalkSeconds - b.totalWalkSeconds ||
			b.place.sources.length - a.place.sources.length ||
			a.place.name.localeCompare(b.place.name),
	);
}
