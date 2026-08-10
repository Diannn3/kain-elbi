/**
 * Product policy for Smart Picks ranking.
 *
 * Keep ranking numbers here rather than scattering them through the ranking
 * implementation. Any intentional ranking change should increment `version`
 * so analytics, screenshots, bug reports, and future provenance can identify
 * which policy produced a result.
 */
export const SMART_PICK_POLICY = Object.freeze({
	version: 1,
	time: Object.freeze({
		minimumStopSeconds: 15 * 60,
		safetyBufferSeconds: 5 * 60,
		fullRouteFitSeconds: 30 * 60,
	}),
	score: Object.freeze({
		routeFitMax: 40,
		efficiencyMax: 30,
		efficientRouteRatio: 1.1,
		acceptableRouteRatio: 1.5,
		acceptableEfficiency: 15,
		multipleSourcesConfidence: 10,
		parseableHoursConfidence: 5,
	}),
} as const);

// Compatibility exports: existing unit tests and call sites can continue to
// import these names while the policy becomes the single source of truth.
export const MINIMUM_STOP_SECONDS = SMART_PICK_POLICY.time.minimumStopSeconds;
export const SAFETY_BUFFER_SECONDS = SMART_PICK_POLICY.time.safetyBufferSeconds;
