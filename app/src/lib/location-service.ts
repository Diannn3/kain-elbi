export type LocationFailureReason =
	| 'unsupported'
	| 'insecure'
	| 'denied'
	| 'timeout'
	| 'unavailable'
	| 'too_approximate'
	| 'outside_supported_area';

export type LocationPermissionState = PermissionState | 'unknown';

export const MAX_ACCEPTABLE_LOCATION_ACCURACY_METERS = 200;

const FAST_OPTIONS: PositionOptions = {
	enableHighAccuracy: false,
	maximumAge: 120_000,
	timeout: 12_000,
};

const PRECISE_OPTIONS: PositionOptions = {
	enableHighAccuracy: true,
	maximumAge: 0,
	timeout: 20_000,
};

const LOCATION_MESSAGES: Record<LocationFailureReason, string> = {
	unsupported: 'Location is not available in this browser. Choose a campus building instead.',
	insecure: 'Location needs a secure HTTPS connection. Choose a campus building instead.',
	denied: 'Location is blocked. Allow location for UPPETITE in your browser or site settings, then try again.',
	timeout: 'Your phone took too long to get a location. Make sure device Location is on, then try again.',
	unavailable: 'Your phone could not provide a location. Turn on device Location and try again, or choose a building.',
	too_approximate: 'Your location is too approximate to choose a campus point safely. Allow precise location, then try again.',
	outside_supported_area: 'You appear to be outside the supported campus area. Choose a campus building instead.',
};

export class LocationAcquisitionError extends Error {
	constructor(public readonly reason: LocationFailureReason) {
		super(LOCATION_MESSAGES[reason]);
		this.name = 'LocationAcquisitionError';
	}
}

export function locationFailureMessage(reason: LocationFailureReason): string {
	return LOCATION_MESSAGES[reason];
}

export function isLocationAccuracyAcceptable(accuracyMeters: number): boolean {
	return Number.isFinite(accuracyMeters)
		&& accuracyMeters >= 0
		&& accuracyMeters <= MAX_ACCEPTABLE_LOCATION_ACCURACY_METERS;
}

export function classifyGeolocationErrorCode(code: number): LocationFailureReason {
	if (code === 1) return 'denied';
	if (code === 3) return 'timeout';
	return 'unavailable';
}

export async function queryGeolocationPermission(): Promise<LocationPermissionState> {
	if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unknown';
	try {
		const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
		return status.state;
	} catch {
		return 'unknown';
	}
}

function requestPosition(options: PositionOptions): Promise<GeolocationPosition> {
	return new Promise((resolve, reject) => {
		navigator.geolocation.getCurrentPosition(resolve, (error) => {
			reject(new LocationAcquisitionError(classifyGeolocationErrorCode(error.code)));
		}, options);
	});
}

export async function acquireCurrentPosition(): Promise<GeolocationPosition> {
	if (typeof window !== 'undefined' && !window.isSecureContext) {
		throw new LocationAcquisitionError('insecure');
	}
	if (typeof navigator === 'undefined' || !navigator.geolocation) {
		throw new LocationAcquisitionError('unsupported');
	}

	const permission = await queryGeolocationPermission();
	if (permission === 'denied') {
		throw new LocationAcquisitionError('denied');
	}

	let coarsePosition: GeolocationPosition | null = null;
	try {
		coarsePosition = await requestPosition(FAST_OPTIONS);
		if (isLocationAccuracyAcceptable(coarsePosition.coords.accuracy)) {
			return coarsePosition;
		}
	} catch (error) {
		if (error instanceof LocationAcquisitionError && error.reason === 'denied') throw error;
	}

	try {
		const precisePosition = await requestPosition(PRECISE_OPTIONS);
		if (!isLocationAccuracyAcceptable(precisePosition.coords.accuracy)) {
			throw new LocationAcquisitionError('too_approximate');
		}
		return precisePosition;
	} catch (error) {
		if (error instanceof LocationAcquisitionError && error.reason === 'denied') throw error;
		if (coarsePosition) {
			throw new LocationAcquisitionError('too_approximate');
		}
		if (error instanceof LocationAcquisitionError) throw error;
		throw new LocationAcquisitionError('unavailable');
	}
}
