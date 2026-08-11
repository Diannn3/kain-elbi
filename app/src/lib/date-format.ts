const addedDateFormatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' });
const researchDateFormatter = new Intl.DateTimeFormat('en-PH', { month: 'short', year: 'numeric', timeZone: 'Asia/Manila' });

function parsePublicDate(value: string): Date | undefined {
	const date = new Date(`${value}T00:00:00+08:00`);
	return Number.isFinite(date.getTime()) ? date : undefined;
}

export function formatAddedDate(value: string): string {
	const date = parsePublicDate(value);
	return date ? addedDateFormatter.format(date) : value;
}

export function formatResearchDate(value: string): string {
	const date = parsePublicDate(value);
	return date ? researchDateFormatter.format(date) : value;
}
