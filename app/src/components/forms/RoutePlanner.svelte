<script lang="ts">
	import BuildingCombobox from './BuildingCombobox.svelte';
	import CurrentLocationControl from './CurrentLocationControl.svelte';
	import { snapToNearestAnchor } from '../../lib/geo';
	import {
		acquireCurrentPosition,
		classifyGeolocationErrorCode,
		isLocationAccuracyAcceptable,
		LocationAcquisitionError,
		locationFailureMessage,
		type LocationFailureReason,
	} from '../../lib/location-service';
	import type { Anchor, Category } from '../../lib/types';
	import { appStorage } from '../../lib/storage.svelte';

	let { anchors }: { anchors: Anchor[] } = $props();
	let breakMinutes = $state(45);
	let showCustomBreak = $state(false);
	let originId = $state('');
	let originMode = $state<'building' | 'nearby'>('building');
	let originQuery = $state('');
	let destinationId = $state('');
	let destinationQuery = $state('');
	let preferredCategory = $state<Category | ''>('');
	let status = $state('');
	let locating = $state(false);
	let currentLocationAnchorId = $state('');
	let currentLocationApproachSeconds = $state(0);
	let originInvalid = $state(false);
	let destinationInvalid = $state(false);
	let locationErrorKind = $state<LocationFailureReason | null>(null);
	let locationRequestId = 0;

	const presets = [20, 30, 45, 60];
	const categories: { value: Category | ''; label: string }[] = [
		{ value: '', label: 'Any food' },
		{ value: 'restaurant', label: 'Rice & meals' },
		{ value: 'cafe', label: 'Café' },
		{ value: 'fast_food', label: 'Quick bites' },
		{ value: 'bakery_deli', label: 'Bakery' },
	];
	const preferenceLabel = $derived(categories.find((category) => category.value === preferredCategory)?.label ?? 'Any food');
	const locationErrorMessage = $derived(locationErrorKind ? locationFailureMessage(locationErrorKind) : '');

	function findAnchor(value: string) {
		const normalized = value.trim().toLocaleLowerCase();
		if (!normalized) return undefined;
		return anchors.find((anchor) => anchor.name.toLocaleLowerCase() === normalized);
	}

	function clearResolvedCurrentLocation() {
		currentLocationAnchorId = '';
		currentLocationApproachSeconds = 0;
		originMode = 'building';
	}

	function beginLocationRequest() {
		const requestId = ++locationRequestId;
		locating = true;
		locationErrorKind = null;
		originInvalid = false;
		status = 'Finding your nearest campus point…';
		return requestId;
	}

	function locationFailure(reason: LocationFailureReason, requestId: number) {
		if (requestId !== locationRequestId) return;
		locating = false;
		locationErrorKind = reason;
		status = '';
		if (!originId) originInvalid = true;
	}

	function acceptCurrentPosition(position: GeolocationPosition, requestId: number) {
		if (requestId !== locationRequestId) return;
		if (!isLocationAccuracyAcceptable(position.coords.accuracy)) {
			locationFailure('too_approximate', requestId);
			return;
		}

		const anchorRecord = Object.fromEntries(
			anchors.map((anchor) => [anchor.id, anchor]),
		);
		const snap = snapToNearestAnchor(
			{ lat: position.coords.latitude, lon: position.coords.longitude },
			anchorRecord,
		);

		if (!snap) {
			locationFailure('outside_supported_area', requestId);
			return;
		}

		locating = false;
		locationErrorKind = null;
		currentLocationAnchorId = snap.anchor.id;
		currentLocationApproachSeconds = snap.approachSeconds;
		originId = snap.anchor.id;
		originMode = 'nearby';
		originQuery = '';
		originInvalid = false;
		status = `Using your current location near ${snap.anchor.name}.`;
	}

	async function requestCurrentLocation() {
		const requestId = beginLocationRequest();
		try {
			const position = await acquireCurrentPosition();
			acceptCurrentPosition(position, requestId);
		} catch (error) {
			const reason = error instanceof LocationAcquisitionError ? error.reason : 'unavailable';
			locationFailure(reason, requestId);
		}
	}

	function beginModernLocationRequest() {
		return beginLocationRequest();
	}

	function handleModernPosition(position: GeolocationPosition, requestId: number) {
		acceptCurrentPosition(position, requestId);
	}

	function handleModernError(error: GeolocationPositionError, requestId: number) {
		locationFailure(classifyGeolocationErrorCode(error.code), requestId);
	}

	function handleOriginInput(value: string) {
		locationRequestId += 1;
		locating = false;
		clearResolvedCurrentLocation();
		locationErrorKind = null;
		originQuery = value;
		const match = findAnchor(value);
		originId = match?.id ?? '';
		originInvalid = false;
		status = '';
	}

	function handleOriginSelect(anchor: Anchor) {
		locationRequestId += 1;
		locating = false;
		clearResolvedCurrentLocation();
		locationErrorKind = null;
		originQuery = anchor.name;
		originId = anchor.id;
		originInvalid = false;
		status = '';
	}

	function handleDestinationInput(value: string) {
		destinationQuery = value;
		const match = findAnchor(value);
		destinationId = match?.id ?? '';
		destinationInvalid = false;
		status = '';
	}

	function handleDestinationSelect(anchor: Anchor) {
		destinationQuery = anchor.name;
		destinationId = anchor.id;
		destinationInvalid = false;
		status = '';
	}

	function clearDestination() {
		destinationId = '';
		destinationQuery = '';
		destinationInvalid = false;
		status = '';
	}

	function setPreset(minutes: number) {
		breakMinutes = minutes;
		showCustomBreak = false;
	}

	function adjustBreak(amount: number) {
		breakMinutes = Math.min(180, Math.max(20, breakMinutes + amount));
	}

	function buildUrl(origin: string, mode: 'building' | 'nearby', approachSeconds = 0) {
		const params = new URLSearchParams({
			origin,
			originMode: mode,
			break: String(breakMinutes),
		});
		if (approachSeconds > 0) params.set('approach', String(approachSeconds));
		if (destinationId) params.set('destination', destinationId);
		if (preferredCategory) params.set('category', preferredCategory);
		return `/picks?${params.toString()}`;
	}

	function handleSubmit(event: SubmitEvent) {
		if (!originId) {
			event.preventDefault();
			originInvalid = true;
			status = 'Choose your current location or select a campus building from the suggestions.';
			return;
		}
		if (destinationQuery.trim() && !destinationId) {
			event.preventDefault();
			destinationInvalid = true;
			status = 'Choose a next-class building from the suggestions, or use “No next class”.';
			return;
		}
		if (originMode !== 'nearby') return;

		event.preventDefault();
		window.location.assign(
			buildUrl(originId, 'nearby', currentLocationApproachSeconds),
		);
	}

</script>

<form class="planner" action="/picks" method="get" onsubmit={handleSubmit}>
	<header class="planner-heading">
		<p class="eyebrow">Plan Your Break</p>
		<h2>Where are you headed?</h2>
		<p>Choose your route and break time. The recommendation check stays on your device.</p>
	</header>

	<div class="planner-fields">
		<fieldset class="location-field">
			<legend>From</legend>
			<BuildingCombobox
				anchors={anchors}
				value={originQuery}
				placeholder="Choose a building"
				ariaLabel="Starting building"
				idPrefix="origin-building"
				invalid={originInvalid}
				describedBy="planner-status"
				onInput={handleOriginInput}
				onSelect={handleOriginSelect}
			/>
			<CurrentLocationControl
				active={originMode === 'nearby' && Boolean(currentLocationAnchorId)}
				{locating}
				errorKind={locationErrorKind}
				errorMessage={locationErrorMessage}
				describedBy="planner-status location-note"
				onModernIntent={beginModernLocationRequest}
				onModernPosition={handleModernPosition}
				onModernError={handleModernError}
				onLegacyRequest={requestCurrentLocation}
			/>
		</fieldset>
		<input type="hidden" name="origin" value={originId} />
		<input type="hidden" name="originMode" value={originMode} />

		<fieldset class="location-field destination-field">
			<legend>Next Class <small>Optional</small></legend>
			<BuildingCombobox
				anchors={anchors}
				value={destinationQuery}
				placeholder="Your next class"
				ariaLabel="Next class building"
				idPrefix="destination-building"
				invalid={destinationInvalid}
				describedBy="planner-status"
				onInput={handleDestinationInput}
				onSelect={handleDestinationSelect}
			/>
			<button class="location-alternative no-next-class" class:active={!destinationId && !destinationQuery} type="button" aria-pressed={!destinationId && !destinationQuery} onclick={clearDestination}>
				<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/></svg>
				<span>No next class</span>
			</button>
		</fieldset>
		<input type="hidden" name="destination" value={destinationId} />
		<p class="field-note route-disclosure">No next class means one-way results; your return trip is not included.</p>

		<fieldset class="break-control">
			<legend>Break Time</legend>
			<div class="preset-grid" aria-label="Break time presets">
				{#each presets as preset}
					<button
						type="button"
						class:active={!showCustomBreak && breakMinutes === preset}
						aria-label={`Set break to ${preset} minutes`}
						aria-pressed={!showCustomBreak && breakMinutes === preset}
						onclick={() => setPreset(preset)}
					>{preset}<small>min</small></button>
				{/each}
				<button type="button" class:active={showCustomBreak} aria-pressed={showCustomBreak} onclick={() => (showCustomBreak = true)}>Custom</button>
			</div>
			{#if showCustomBreak}
				<div class="custom-stepper">
					<button type="button" aria-label="Remove 5 minutes" onclick={() => adjustBreak(-5)}>−</button>
					<label class="minutes">
						<span class="sr-only">Break time in minutes</span>
						<input type="number" min="20" max="180" step="5" inputmode="numeric" aria-label="Break time in minutes" bind:value={breakMinutes} />
						<small>min</small>
					</label>
					<button type="button" aria-label="Add 5 minutes" onclick={() => adjustBreak(5)}>+</button>
				</div>
			{/if}
		</fieldset>
		<input type="hidden" name="break" value={breakMinutes} />

		<details class="preference-control">
			<summary><span>Food preference</span><strong>{preferenceLabel}</strong></summary>
			<fieldset class="cravings">
				<legend class="sr-only">Food preference</legend>
				<div class="chips">
					{#each categories as category}
						<label class:active={preferredCategory === category.value}>
							<input type="radio" name="category" value={category.value} bind:group={preferredCategory} />
							<span>{category.label}</span>
						</label>
					{/each}
				</div>
			</fieldset>
		</details>

		{#if appStorage.recentSearches.length > 0}
			<div class="recent-routes">
				<p class="eyebrow">Recent Routes</p>
				<div class="recent-list">
					{#each appStorage.recentSearches as search}
						<a href="/picks{search.url}">
							<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" fill="none" stroke-width="2"/></svg>
							{search.label}
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<button class="find-button" type="submit" disabled={locating}>
			{locating ? 'Finding Your Route…' : 'Find Food'}
			<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
		</button>
		<p class="status" id="planner-status" aria-live="polite">{status}</p>
		<p class="privacy-note" id="location-note">
			<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Zm0 5v4m0 4h.01" /></svg>
			Location permission is requested when you choose current location or search with it. Exact coordinates are not stored.
		</p>
	</div>
</form>

<style>
	.planner {
		padding: var(--space-5);
		border: 1px solid hsl(0 0% 100% / 0.72);
		border-radius: var(--radius-xl);
		background: linear-gradient(145deg, rgb(255 249 241 / 0.92), rgb(242 232 220 / 0.94));
		box-shadow: 0 1.5rem 4rem rgb(35 4 8 / 0.24);
		backdrop-filter: blur(18px) saturate(1.06);
	}
	.planner-heading { margin-bottom: var(--space-4); }
	.eyebrow,
	legend {
		font-family: var(--font-display);
		font-size: 0.76rem;
		font-weight: 760;
		letter-spacing: 0.11em;
		text-transform: uppercase;
		color: var(--color-primary);
	}
	.eyebrow { margin: 0; color: var(--color-text-accent); }
	.planner-heading h2 { margin: 0.5rem 0 0; color: var(--color-primary); font: 780 clamp(1.65rem, 4vw, 2.15rem)/0.98 var(--font-display); }
	.planner-heading > p:last-child { max-width: 42rem; margin: 0.65rem 0 0; color: var(--color-text-muted); line-height: 1.5; }
	.planner-fields { display: grid; gap: var(--space-4); }
	.planner-fields > * { min-width: 0; }
	fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
	legend { margin-bottom: 0.65rem; }
	legend small { color: var(--color-text-muted); font: inherit; }
	.location-field { display: grid; gap: var(--space-2); align-content: start; }
	.location-alternative,
	.preset-grid button,
	.custom-stepper > button,
	.find-button {
		min-height: var(--tap-target);
	}
	.location-alternative {
		display: flex;
		align-items: center;
		justify-content: center;
		justify-self: start;
		gap: var(--space-2);
		width: auto;
		padding: 0 var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: 999px;
		background: hsl(45 50% 98% / 0.55);
		color: var(--color-text-muted);
		font: 700 0.82rem/1 var(--font-body);
		transition: border-color 150ms ease, background-color 150ms ease, transform 150ms ease;
	}
	.location-alternative:hover { border-color: var(--color-border-strong); background: var(--brand-sand); color: var(--color-primary); transform: translateY(-1px); }
	.location-alternative.active { border-color: var(--color-border-strong); background: var(--color-surface-muted); color: var(--color-primary); box-shadow: inset 0 0 0 1px var(--color-border-strong); }
	.location-alternative svg { width: 1.1rem; height: 1.1rem; flex: none; fill: none; stroke: currentColor; stroke-width: 1.8; }
	.field-note { margin: 0; color: var(--color-text-muted); font-size: 0.75rem; line-height: 1.4; }
	.route-disclosure { grid-column: 1 / -1; padding-left: var(--space-1); }
	.preset-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0.45rem; }
	.preset-grid button {
		padding: 0.4rem;
		border: 1px solid var(--color-border);
		border-radius: 0.85rem;
		background: var(--color-surface-raised);
		color: var(--color-text);
		font: 750 0.95rem/1 var(--font-body);
	}
	.preset-grid button small { display: block; margin-top: 0.15rem; color: var(--color-text-muted); font-size: 0.62rem; font-weight: 600; }
	.preset-grid button.active { border-color: var(--color-primary); background: var(--color-primary); color: white; }
	.preset-grid button.active small { color: hsl(0 0% 100% / 0.7); }
	.custom-stepper { display: flex; align-items: center; justify-content: center; gap: 0.8rem; margin-top: 0.7rem; padding: 0.75rem; border-radius: var(--radius-md); background: var(--color-surface-muted); }
	.custom-stepper > button { min-width: var(--tap-target); border: 1px solid var(--color-border); border-radius: 0.85rem; background: var(--color-surface-raised); color: var(--color-primary); font-size: 1.25rem; }
	.minutes { display: flex; align-items: baseline; gap: 0.3rem; }
	.minutes input { width: 3.6ch; padding: 0; border: 0; background: transparent; color: var(--color-primary); font: 780 2.25rem/1 var(--font-display); font-variant-numeric: tabular-nums; }
	.minutes small { color: var(--color-text-muted); font-weight: 700; }
	.preference-control { border: 1px solid var(--color-border); border-radius: var(--radius-md); background: hsl(45 50% 98% / 0.75); }
	.preference-control summary { display: flex; min-height: var(--tap-target); align-items: center; justify-content: space-between; gap: 1rem; padding: 0.7rem 0.9rem; color: var(--color-primary); cursor: pointer; list-style-position: inside; }
	.preference-control summary { list-style: none; }
	.preference-control summary::-webkit-details-marker { display: none; }
	.preference-control summary::after { content: '›'; color: var(--color-text-muted); transform: rotate(90deg); }
	.preference-control[open] summary::after { transform: rotate(-90deg); }
	.preference-control summary span { font: 720 0.8rem/1 var(--font-display); letter-spacing: 0.04em; text-transform: uppercase; }
	.preference-control summary strong { margin-left: auto; color: var(--color-text-accent); font-size: 0.85rem; }
	.cravings { padding: 0 0.8rem 0.8rem; }
	.chips { display: flex; gap: 0.5rem; overflow-x: auto; padding: 0.15rem 0.1rem 0.25rem; scrollbar-width: none; }
	.chips::-webkit-scrollbar { display: none; }
	.chips label { flex: 0 0 auto; }
	.chips input { position: absolute; opacity: 0; pointer-events: none; }
	.chips label span {
		display: grid;
		place-items: center;
		min-height: var(--tap-target);
		padding: 0 1rem;
		border: 1px solid var(--color-border);
		border-radius: 999px;
		background: var(--color-surface-raised);
		color: var(--color-primary);
		font-weight: 680;
		white-space: nowrap;
		transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
	}
	.chips label:hover span { background: var(--color-surface-muted); }
	.chips label.active span { border-color: var(--color-primary); background: var(--color-primary); color: white; }
	.recent-routes { grid-column: 1 / -1; margin: 0.25rem 0 0.5rem; }
	.recent-list { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.65rem; }
	.recent-list a { display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.75rem; border: 1px solid var(--color-border); border-radius: 999px; background: var(--color-surface-raised); color: var(--color-primary); font-size: 0.78rem; font-weight: 650; text-decoration: none; transition: background 150ms ease; }
	.recent-list a:hover { background: var(--color-surface-muted); }
	.recent-list svg { width: 1.1rem; opacity: 0.7; }
	.find-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		min-height: 3.5rem;
		border: 0;
		border-radius: 1.05rem;
		background: var(--color-primary);
		color: white;
		font: 760 1.05rem/1 var(--font-display);
		letter-spacing: 0.02em;
		box-shadow: 0 0.75rem 1.5rem rgb(92 16 22 / 0.2);
		transition: transform 160ms ease, background-color 160ms ease;
	}
	.find-button:hover { background: var(--color-primary-hover); transform: translateY(-2px); }
	.find-button:active { transform: translateY(0); }
	.find-button:disabled { opacity: 0.72; cursor: wait; }
	.find-button svg { width: 1.5rem; fill: none; stroke: currentColor; stroke-width: 2; }
	.status { min-height: 1.25rem; margin: -0.6rem 0 0; color: var(--color-text-muted); font-size: 0.8rem; line-height: 1.4; }
	.status:empty { display: none; }
	.privacy-note { display: flex; gap: 0.5rem; align-items: start; max-width: 46rem; margin: 0; color: var(--color-text-muted); font-size: 0.72rem; line-height: 1.4; }
	.privacy-note svg { width: 1.15rem; flex: none; margin-top: 0.05rem; fill: none; stroke: var(--color-primary); stroke-width: 1.8; }
	@media (min-width: 720px) {
		.planner { padding: var(--space-6); }
		.planner-fields { grid-template-columns: 1fr 1fr; column-gap: var(--space-4); }
		.break-control, .preference-control, .find-button, .status, .privacy-note { grid-column: 1 / -1; }
		.break-control { max-width: 38rem; }
		.find-button { max-width: 24rem; justify-self: start; width: 100%; }
	}
	@media (min-width: 960px) {
		.planner { padding: var(--space-6); }
		.planner-heading { margin-bottom: var(--space-4); }
		.planner-heading > p:last-child { margin-top: var(--space-2); font-size: 0.86rem; }
		.planner-fields { gap: var(--space-4); column-gap: var(--space-4); }
		.field-note { font-size: 0.72rem; }
		.preset-grid button { min-height: var(--tap-target); }
		.find-button { max-width: none; min-height: 3.25rem; }
		.privacy-note { margin-top: calc(var(--space-2) * -1); }
	}
	@media (min-width: 1100px) and (max-height: 960px) {
		.planner { padding: var(--space-5); }
		.planner-heading { margin-bottom: var(--space-3); }
		.planner-heading h2 { margin-top: var(--space-1); }
		.planner-heading > p:last-child { margin-top: var(--space-1); line-height: 1.35; }
		.planner-fields { gap: var(--space-3); column-gap: var(--space-4); }
		legend { margin-bottom: var(--space-2); }
		.route-disclosure { line-height: 1.3; }
		.preset-grid button { min-height: 2.75rem; }
		.recent-routes { position: relative; margin: 0; min-width: 0; }
		.recent-routes::after {
			content: '';
			position: absolute;
			right: 0;
			bottom: 0;
			width: var(--space-8);
			height: 2.5rem;
			pointer-events: none;
			background: linear-gradient(to right, transparent, rgb(242 232 220 / 0.96));
		}
		.recent-list {
			flex-wrap: nowrap;
			overflow-x: auto;
			overflow-y: hidden;
			margin-top: var(--space-2);
			padding: 0 var(--space-6) var(--space-1) 0;
			scroll-padding-inline: var(--space-2);
			scrollbar-width: thin;
		}
		.recent-list a { flex: 0 0 auto; scroll-snap-align: start; }
		.find-button { min-height: var(--tap-target); }
		.privacy-note { margin-top: calc(var(--space-1) * -1); }
	}
	@media (max-width: 420px) {
		.planner { padding: 1.25rem; border-radius: 1.5rem; }
		.preset-grid { grid-template-columns: repeat(4, 1fr); }
		.preset-grid button:last-child { grid-column: 1 / -1; }
	}
	@media (prefers-reduced-motion: reduce) { .find-button, .location-alternative { transition: none; } }
</style>
