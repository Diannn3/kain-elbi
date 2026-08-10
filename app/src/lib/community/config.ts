export interface CommunityFormConfig {
	addPlace: string;
	suggestEdit: string;
	reportProblem: string;
	businessUpdate: string;
	submitEvent: string;
	suggestEditPlaceIdEntry: string;
	businessUpdatePlaceIdEntry: string;
}

export type CommunityFeatureReadiness = 'hidden' | 'beta' | 'live';

export interface CommunityFeaturePolicy {
	pulse: CommunityFeatureReadiness;
	photos: CommunityFeatureReadiness;
	events: CommunityFeatureReadiness;
	/** Minimum total 30-day reports before popularity rankings are rendered. */
	pulseMinimumReports: number;
}

export const communityForms: Readonly<CommunityFormConfig> = Object.freeze({
	addPlace: '',
	suggestEdit: '',
	reportProblem: '',
	businessUpdate: '',
	submitEvent: '',
	suggestEditPlaceIdEntry: '',
	businessUpdatePlaceIdEntry: '',
});

/**
 * Product-readiness gates are explicit instead of being inferred from whether
 * a backend URL happens to be configured. This prevents half-populated beta
 * modules from presenting sparse data as an established community signal.
 */
export const communityFeatures: Readonly<CommunityFeaturePolicy> = Object.freeze({
	pulse: 'beta',
	photos: 'beta',
	events: 'beta',
	pulseMinimumReports: 5,
});

export function isGoogleFormUrl(value: string): boolean {
	if (!value || value.includes('REPLACE_WITH_')) return false;
	try {
		const url = new URL(value);
		if (url.protocol !== 'https:') return false;
		if (url.hostname === 'forms.gle') return true;
		return url.hostname === 'docs.google.com' && url.pathname.includes('/forms/');
	} catch {
		return false;
	}
}

export function isPrefillableGoogleFormUrl(value: string): boolean {
	if (!isGoogleFormUrl(value)) return false;
	try {
		const url = new URL(value);
		return url.hostname === 'docs.google.com' && url.pathname.includes('/forms/');
	} catch {
		return false;
	}
}

export function isGoogleFormEntryKey(value: string): boolean {
	return /^entry\.\d+$/.test(value);
}
