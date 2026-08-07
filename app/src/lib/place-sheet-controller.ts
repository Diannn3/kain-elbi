const HISTORY_KEY = 'kainElbiPlaceSheet';

interface ControllerOptions<T> {
	contentRoot: HTMLElement;
	resolveById: (id: string) => T | undefined;
	getId: (item: T) => string;
	setSelected: (item: T | undefined) => void;
}

export interface PlaceSheetController<T> {
	open(item: T, trigger?: HTMLElement | null): void;
	close(): void;
	syncFromUrl(options?: { restoreFocus?: boolean }): void;
	destroy(): void;
}

function setInert(element: HTMLElement, value: boolean) {
	element.inert = value;
	if (value) element.setAttribute('inert', '');
	else element.removeAttribute('inert');
}

function bodyOwner(element: HTMLElement) {
	let owner = element;
	while (owner.parentElement && owner.parentElement !== document.body) owner = owner.parentElement;
	return owner.parentElement === document.body ? owner : undefined;
}

function focusMainContent() {
	const main = document.querySelector<HTMLElement>('#main-content');
	if (!main) return;
	const hadTabindex = main.hasAttribute('tabindex');
	if (!hadTabindex) main.setAttribute('tabindex', '-1');
	main.focus();
	if (!hadTabindex) main.removeAttribute('tabindex');
}

export function createPlaceSheetController<T>(options: ControllerOptions<T>): PlaceSheetController<T> {
	let active = false;
	let destroyed = false;
	let trigger: HTMLElement | null = null;
	const inertSnapshot = new Map<HTMLElement, boolean>();

	function backgroundTargets() {
		const owner = bodyOwner(options.contentRoot);
		const chrome = Array.from(document.body.children).filter((element): element is HTMLElement =>
			element instanceof HTMLElement
			&& element !== owner
			&& !['SCRIPT', 'STYLE'].includes(element.tagName),
		);
		return [options.contentRoot, ...chrome];
	}

	function applyInert(value: boolean) {
		if (value) {
			for (const element of backgroundTargets()) {
				if (!inertSnapshot.has(element)) inertSnapshot.set(element, element.inert || element.hasAttribute('inert'));
				setInert(element, true);
			}
			return;
		}
		for (const [element, wasInert] of inertSnapshot) setInert(element, wasInert);
		inertSnapshot.clear();
	}

	function removePlaceParameter() {
		const url = new URL(window.location.href);
		url.searchParams.delete('place');
		const state = { ...(window.history.state ?? {}) };
		delete state[HISTORY_KEY];
		window.history.replaceState(state, '', url);
	}

	function restoreSavedFocus() {
		if (trigger?.isConnected) trigger.focus();
		else focusMainContent();
	}

	function syncFromUrl({ restoreFocus = true }: { restoreFocus?: boolean } = {}) {
		if (destroyed) return;
		const wasActive = active;
		const id = new URLSearchParams(window.location.search).get('place');
		const selected = id ? options.resolveById(id) : undefined;
		if (id && !selected) removePlaceParameter();
		active = Boolean(selected);
		options.setSelected(selected);
		applyInert(active);
		if (wasActive && !active && restoreFocus) restoreSavedFocus();
	}

	function open(item: T, nextTrigger?: HTMLElement | null) {
		if (destroyed) return;
		trigger = nextTrigger ?? document.activeElement as HTMLElement | null;
		const id = options.getId(item);
		const url = new URL(window.location.href);
		const currentId = url.searchParams.get('place');
		url.searchParams.set('place', id);
		const marker = { placeId: id, pathname: url.pathname };
		const state = { ...(window.history.state ?? {}), [HISTORY_KEY]: marker };
		if (currentId) window.history.replaceState(state, '', url);
		else window.history.pushState(state, '', url);
		syncFromUrl({ restoreFocus: false });
	}

	function close() {
		if (destroyed) return;
		const id = new URLSearchParams(window.location.search).get('place');
		const marker = window.history.state?.[HISTORY_KEY];
		if (id && marker?.placeId === id && marker?.pathname === window.location.pathname) {
			window.history.back();
			return;
		}
		removePlaceParameter();
		syncFromUrl({ restoreFocus: true });
	}

	const handlePopState = () => syncFromUrl({ restoreFocus: true });
	window.addEventListener('popstate', handlePopState);

	return {
		open,
		close,
		syncFromUrl,
		destroy() {
			if (destroyed) return;
			destroyed = true;
			window.removeEventListener('popstate', handlePopState);
			applyInert(false);
		},
	};
}
