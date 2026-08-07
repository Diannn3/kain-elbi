// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlaceSheetController } from '../../src/lib/place-sheet-controller';

type Item = { id: string };

function fixture() {
	document.body.innerHTML = `
		<a id="skip" href="#main-content">Skip</a>
		<header id="header"><a href="/">Home</a></header>
		<main id="main-content">
			<astro-island id="island">
				<section id="picks-content"><button id="trigger">Details</button></section>
			</astro-island>
		</main>
		<nav id="nav"><a href="/map">Map</a></nav>
		<footer id="footer">Footer</footer>
	`;
	const items: Item[] = [{ id: 'alpha' }];
	let selected: Item | undefined;
	const controller = createPlaceSheetController<Item>({
		contentRoot: document.querySelector<HTMLElement>('#picks-content')!,
		resolveById: (id) => items.find((item) => item.id === id),
		getId: (item) => item.id,
		setSelected: (item) => { selected = item; },
	});
	return { controller, getSelected: () => selected };
}

describe('place sheet controller', () => {
	beforeEach(() => history.replaceState({}, '', '/picks?origin=Math'));
	afterEach(() => {
		document.body.innerHTML = '';
		vi.restoreAllMocks();
	});

	it('keeps URL, selection, page chrome, and focus synchronized across history navigation', () => {
		const { controller, getSelected } = fixture();
		const trigger = document.querySelector<HTMLButtonElement>('#trigger')!;
		trigger.focus();

		controller.open({ id: 'alpha' }, trigger);

		expect(new URL(location.href).searchParams.get('place')).toBe('alpha');
		expect(getSelected()?.id).toBe('alpha');
		expect(document.querySelector<HTMLElement>('#picks-content')!.inert).toBe(true);
		expect(document.querySelector<HTMLElement>('#header')!.inert).toBe(true);
		expect(document.querySelector<HTMLElement>('#nav')!.inert).toBe(true);
		expect(document.querySelector<HTMLElement>('#footer')!.inert).toBe(true);

		history.replaceState({}, '', '/picks?origin=Math');
		window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));

		expect(getSelected()).toBeUndefined();
		expect(document.querySelector<HTMLElement>('#picks-content')!.inert).toBe(false);
		expect(document.querySelector<HTMLElement>('#header')!.inert).toBe(false);
		expect(document.activeElement).toBe(trigger);
		controller.destroy();
	});

	it('closes a direct deep link by replacing only the place parameter', () => {
		history.replaceState({}, '', '/picks?origin=Math&place=alpha');
		const back = vi.spyOn(history, 'back');
		const { controller, getSelected } = fixture();

		controller.syncFromUrl();
		expect(getSelected()?.id).toBe('alpha');
		controller.close();

		expect(back).not.toHaveBeenCalled();
		expect(location.pathname).toBe('/picks');
		expect(new URL(location.href).searchParams.get('origin')).toBe('Math');
		expect(new URL(location.href).searchParams.has('place')).toBe(false);
		expect(getSelected()).toBeUndefined();
		controller.destroy();
	});

	it('normalizes an unknown place id without leaving the background inert', () => {
		history.replaceState({}, '', '/picks?place=missing');
		const { controller, getSelected } = fixture();

		controller.syncFromUrl();

		expect(getSelected()).toBeUndefined();
		expect(new URL(location.href).searchParams.has('place')).toBe(false);
		expect(document.querySelector<HTMLElement>('#picks-content')!.hasAttribute('inert')).toBe(false);
		controller.destroy();
	});
});
