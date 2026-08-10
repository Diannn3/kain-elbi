export interface CommunityFormConfig {
	addPlace: string;
	suggestEdit: string;
	reportProblem: string;
	businessUpdate: string;
	submitEvent: string;
	suggestEditPlaceIdEntry: string;
	businessUpdatePlaceIdEntry: string;
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
