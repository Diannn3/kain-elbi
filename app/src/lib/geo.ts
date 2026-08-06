import type { Anchor } from './types';

const EARTH_RADIUS_METERS = 6_371_000;
const MAX_SNAP_METERS = 300;

function radians(degrees: number): number {
	return (degrees * Math.PI) / 180;
}

export function distanceMeters(
	from: { lat: number; lon: number },
	to: { lat: number; lon: number },
): number {
	const latDelta = radians(to.lat - from.lat);
	const lonDelta = radians(to.lon - from.lon);
	const fromLat = radians(from.lat);
	const toLat = radians(to.lat);
	const haversine =
		Math.sin(latDelta / 2) ** 2 +
		Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) ** 2;
	return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

export function snapToNearestAnchor(
	position: { lat: number; lon: number },
	anchors: Record<string, Anchor>,
): { anchor: Anchor; distanceMeters: number; approachSeconds: number } | null {
	const candidates = Object.values(anchors)
		.map((anchor) => ({ anchor, distanceMeters: distanceMeters(position, anchor) }))
		.sort((a, b) => a.distanceMeters - b.distanceMeters);
	const nearest = candidates[0];
	if (!nearest || nearest.distanceMeters > MAX_SNAP_METERS) return null;
	return { ...nearest, approachSeconds: Math.ceil(nearest.distanceMeters / 1) };
}
