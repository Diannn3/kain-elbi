// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import RoutePlanner from '../../src/components/forms/RoutePlanner.svelte';

const anchors = [
	{ id: 'math_bldg', name: 'Math Building', lat: 14.167, lon: 121.243 },
	{ id: 'physci_bldg', name: 'Physical Sciences Building', lat: 14.165, lon: 121.242 },
];

describe('RoutePlanner', () => {
	it('makes current location first-class and provides searchable building fields', () => {
		render(RoutePlanner, { anchors });

		expect(screen.getByRole('button', { name: /use my current location/i })).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByLabelText('Starting building')).toBeInTheDocument();
		expect(screen.getByLabelText('Next class building')).toBeInTheDocument();
	});

	it('uses presets first and progressively reveals a custom break control', async () => {
		render(RoutePlanner, { anchors });

		await fireEvent.click(screen.getByRole('button', { name: 'Set break to 30 minutes' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
		expect(screen.getByLabelText('Break time in minutes')).toHaveValue(30);

		await fireEvent.click(screen.getByRole('button', { name: 'Add 5 minutes' }));
		expect(screen.getByLabelText('Break time in minutes')).toHaveValue(35);
	});

	it('explains one-way mode before submission', () => {
		render(RoutePlanner, { anchors });
		expect(screen.getByText(/return trip is not included/i)).toBeInTheDocument();
	});
});
