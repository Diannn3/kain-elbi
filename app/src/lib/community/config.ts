export interface CommunityFormConfig {
	addPlace: string;
	suggestEdit: string;
	reportProblem: string;
	suggestEditPlaceIdEntry: string;
}

/**
 * Public Google Form responder URLs.
 *
 * Release rule:
 * - Keep values empty while the corresponding production form is not ready.
 * - Never use REPLACE_WITH_* or another fake URL.
 * - community.spec.ts intentionally fails the production E2E gate until all
 *   required URLs and the Suggest Edit place-ID entry key are real.
 *
 * For `suggestEditPlaceIdEntry`, use the `entry.<digits>` key from Google
 * Forms' "Get pre-filled link" responder URL.
 */
export const communityForms: Readonly<CommunityFormConfig> = Object.freeze({
	addPlace: '',
	suggestEdit: '',
	reportProblem: '',
	suggestEditPlaceIdEntry: '',
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
