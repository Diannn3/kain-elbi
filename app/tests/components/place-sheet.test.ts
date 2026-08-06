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
	confidenceLabel: 'Limited place information' as const,
	hasParseableHours: false,
};

describe('PlaceSheet', () => {
	it('renders as a dialog and closes with Escape', async () => {
		const onClose = vi.fn();
		render(PlaceSheet, { place, open: true, onClose });

		expect(screen.getByRole('dialog', { name: 'Campus Café details' })).toBeInTheDocument();
		await fireEvent.keyDown(document, { key: 'Escape' });
		expect(onClose).toHaveBeenCalledOnce();
	});

	it('uses candidate language and exposes an external directions link', () => {
		render(PlaceSheet, { place, open: true, onClose: () => undefined });
		expect(screen.getByText('Candidate place record')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /open external directions/i })).toHaveAttribute(
			'target',
			'_blank',
		);
	});
});
