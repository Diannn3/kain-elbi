// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import PlaceSheet from '../../src/components/place/PlaceSheet.svelte';

const place = {
	id: 'place-1',
	name: 'Campus Café',
	lat: 14.167,
	lon: 121.243,
	category: 'cafe' as const,
	cuisine: ['coffee'],
	phone: null,
	website: null,
	openingHours: null,
	recordStatus: 'candidate' as const,
	sources: [{ source: 'osm', sourceId: 'node/1' }],
	independentSourceCount: 1,
	overtureConfidence: null,
	operatingStatus: null,
	confidenceLabel: 'Limited place information' as const,
	hasParseableHours: false,
};

const pick = {
	place,
	timeRemainingSeconds: 1560,
	totalWalkSeconds: 840,
	walkToPlaceSeconds: 420,
	walkFromPlaceSeconds: 420,
	directWalkSeconds: 600,
	detourSeconds: 240,
	arrivalAt: '2026-08-07T12:10:00+08:00',
	estimatedDepartureAt: '2026-08-07T12:36:00+08:00',
	availability: 'open_at_arrival' as const,
	score: 91,
	scoreBreakdown: { routeFit: 36, efficiency: 27, category: 14, confidence: 14 },
	explanation: 'Small detour toward your next class and leaves 26 minutes for your stop.',
	confidence: 'Limited place information' as const,
};

describe('PlaceSheet', () => {
	it('uses the native dialog primitive and closes on cancel', async () => {
		const onClose = vi.fn();
		render(PlaceSheet, { place, open: true, onClose });

		const dialog = screen.getByRole('dialog', { name: 'Campus Café details' });
		expect(dialog.tagName).toBe('DIALOG');
		await fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
		expect(onClose).toHaveBeenCalledOnce();
	});

	it('prioritizes route decisions and actions without exposing provenance', () => {
		render(PlaceSheet, { place, pick, open: true, onClose: () => undefined });

		expect(screen.getByText('Why this fits your break')).toBeInTheDocument();
		expect(screen.getByText('26')).toBeInTheDocument();
		expect(screen.getByText('+4')).toBeInTheDocument();
		expect(screen.getAllByText(/Open at estimated arrival/i)[0]).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /get directions/i })).toHaveAttribute('target', '_blank');
		expect(screen.getByRole('link', { name: /full place page/i })).toHaveAttribute('href', '/place/place-1');
		expect(screen.getByText('About this place')).toBeInTheDocument();
		expect(screen.queryByText('About this listing')).not.toBeInTheDocument();
		expect(screen.queryByText('Candidate place record')).not.toBeInTheDocument();
		expect(screen.getByRole('link', { name: /suggest an edit/i })).toHaveAttribute('href', '/contribute?place=place-1#suggest-edit');
	});

	it('shows hours once without duplicating them in the facts list', () => {
		render(PlaceSheet, { place, open: true, onClose: () => undefined });
		expect(screen.getAllByText('Hours unavailable')).toHaveLength(1);
		expect(screen.queryByText(/Closed now/i)).not.toBeInTheDocument();
		expect(screen.queryByText('Hours', { selector: 'dt' })).not.toBeInTheDocument();
	});
});
