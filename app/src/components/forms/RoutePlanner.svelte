<script lang="ts">
	import { snapToNearestAnchor } from '../../lib/geo';
	import type { Anchor, Category } from '../../lib/types';

	let { anchors }: { anchors: Anchor[] } = $props();
	let breakMinutes = $state(45);
	let showCustomBreak = $state(false);
	let originId = $state('current');
	let originQuery = $state('');
	let destinationId = $state('');
	let destinationQuery = $state('');
	let preferredCategory = $state<Category | ''>('');
	let status = $state('');
	let locating = $state(false);
	let originInvalid = $state(false);
	let destinationInvalid = $state(false);

	const presets = [20, 30, 45, 60];
	const categories: { value: Category | ''; label: string }[] = [
		{ value: '', label: 'Any food' },
		{ value: 'restaurant', label: 'Rice & meals' },
		{ value: 'cafe', label: 'Café' },
		{ value: 'fast_food', label: 'Quick bites' },
		{ value: 'bakery_deli', label: 'Bakery' },
	];
	const preferenceLabel = $derived(categories.find((category) => category.value === preferredCategory)?.label ?? 'Any food');

	function findAnchor(value: string) {
		const normalized = value.trim().toLocaleLowerCase();
		if (!normalized) return undefined;
		return anchors.find((anchor) => anchor.name.toLocaleLowerCase() === normalized);
	}

	function chooseCurrentLocation() {
		originId = 'current';
		originQuery = '';
		originInvalid = false;
		status = '';
	}

	function handleOriginInput(value: string) {
		originQuery = value;
		const match = findAnchor(value);
		originId = match?.id ?? '';
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
		if (originId !== 'current' && !originId) {
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
		if (originId !== 'current') return;

		event.preventDefault();
		if (!navigator.geolocation) {
			status = 'Location is unavailable. Search for a campus building instead.';
			return;
		}

		locating = true;
		status = 'Finding your nearest campus point…';
		navigator.geolocation.getCurrentPosition(
			(position) => {
				const anchorRecord = Object.fromEntries(anchors.map((anchor) => [anchor.id, anchor]));
				const snap = snapToNearestAnchor(
					{ lat: position.coords.latitude, lon: position.coords.longitude },
					anchorRecord,
				);
				if (!snap) {
					locating = false;
					status = 'You are outside the supported campus area. Search for a building instead.';
					return;
				}
				window.location.assign(buildUrl(snap.anchor.id, 'nearby', snap.approachSeconds));
			},
			() => {
				locating = false;
				status = 'Location permission was not granted. Search for a campus building instead.';
			},
			{ enableHighAccuracy: false, maximumAge: 60_000, timeout: 8_000 },
		);
	}
</script>

<form class="planner" action="/picks" method="get" onsubmit={handleSubmit}>
	<header class="planner-heading">
		<p class="eyebrow">Plan Your Break</p>
		<h2>Where are you headed?</h2>
		<p>Give Kain Elbi the route context. The recommendation check stays on your device.</p>
	</header>

	<div class="planner-fields">
		<fieldset class="location-field">
			<legend>From</legend>
			<button
				class="current-location"
				class:active={originId === 'current'}
				type="button"
				aria-pressed={originId === 'current'}
				onclick={chooseCurrentLocation}
			>
				<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Zm0-8.5A2.5 2.5 0 1 0 12 7a2.5 2.5 0 0 0 0 5.5Z" /></svg>
				<span><strong>Use my current location</strong><small>Used once, never stored</small></span>
			</button>
			<div class="or-row" aria-hidden="true"><span></span><b>or</b><span></span></div>
			<label class="search-field">
				<span class="sr-only">Starting building</span>
				<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" /></svg>
				<input
					type="search"
					list="origin-anchor-options"
					placeholder="Search a UPLB building"
					autocomplete="off"
					aria-label="Starting building"
					aria-invalid={originInvalid}
					aria-describedby="planner-status"
					value={originQuery}
					oninput={(event) => handleOriginInput(event.currentTarget.value)}
				/>
			</label>
			<datalist id="origin-anchor-options">
				{#each anchors as anchor}<option value={anchor.name}></option>{/each}
			</datalist>
		</fieldset>
		<input type="hidden" name="origin" value={originId} />
		<input type="hidden" name="originMode" value={originId === 'current' ? 'nearby' : 'building'} />

		<fieldset class="location-field destination-field">
			<legend>Next Class <small>Optional</small></legend>
			<label class="search-field">
				<span class="sr-only">Next class building</span>
				<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" /></svg>
				<input
					type="search"
					list="destination-anchor-options"
					placeholder="Search next-class building"
					autocomplete="off"
					aria-label="Next class building"
					aria-invalid={destinationInvalid}
					aria-describedby="planner-status"
					value={destinationQuery}
					oninput={(event) => handleDestinationInput(event.currentTarget.value)}
				/>
			</label>
			<datalist id="destination-anchor-options">
				{#each anchors as anchor}<option value={anchor.name}></option>{/each}
			</datalist>
			<button class="no-next-class" class:active={!destinationId && !destinationQuery} type="button" onclick={clearDestination}>
				<span aria-hidden="true">○</span> No next class
			</button>
			<p class="field-note">No next class? Your return trip is not included in one-way mode.</p>
		</fieldset>
		<input type="hidden" name="destination" value={destinationId} />

		<fieldset class="break-control">
			<legend>Break Time</legend>
			<div class="preset-grid" aria-label="Break time presets">
				{#each presets as preset}
					<button
						type="button"
						class:active={!showCustomBreak && breakMinutes === preset}
						aria-label={`Set break to ${preset} minutes`}
						onclick={() => setPreset(preset)}
					>{preset}<small>min</small></button>
				{/each}
				<button type="button" class:active={showCustomBreak} onclick={() => (showCustomBreak = true)}>Custom</button>
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

		<button class="find-button" type="submit" disabled={locating}>
			{locating ? 'Finding Your Route…' : 'Find Food'}
			<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
		</button>
		<p class="status" id="planner-status" aria-live="polite">{status}</p>
	</div>
</form>

<p class="privacy-note" id="location-note">
	<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Zm0 5v4m0 4h.01" /></svg>
	Location permission is only requested when you search with current location. Exact coordinates are not stored.
</p>

<style>
	.planner {
		padding: var(--space-6);
		border: 1px solid hsl(0 0% 100% / 0.72);
		border-radius: var(--radius-xl);
		background: hsl(45 44% 99% / 0.82);
		box-shadow: 0 1.5rem 4rem hsl(154 76% 13% / 0.12);
		backdrop-filter: blur(22px) saturate(1.1);
	}
	.planner-heading { margin-bottom: var(--space-6); }
	.eyebrow,
	legend {
		font-family: var(--font-display);
		font-size: 0.76rem;
		font-weight: 760;
		letter-spacing: 0.11em;
		text-transform: uppercase;
		color: var(--forest);
	}
	.eyebrow { margin: 0; color: var(--text-accent); }
	.planner-heading h2 { margin: 0.5rem 0 0; color: var(--forest); font: 780 clamp(1.65rem, 6vw, 2.5rem)/0.96 var(--font-display); }
	.planner-heading > p:last-child { max-width: 42rem; margin: 0.65rem 0 0; color: var(--text-secondary); line-height: 1.5; }
	.planner-fields { display: grid; gap: var(--space-6); }
	fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
	legend { margin-bottom: 0.65rem; }
	legend small { color: var(--text-secondary); font: inherit; }
	.location-field { display: grid; gap: 0.65rem; align-content: start; }
	.current-location,
	.search-field,
	.no-next-class,
	.preset-grid button,
	.custom-stepper > button,
	.find-button {
		min-height: var(--tap-target);
	}
	.current-location {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.7rem 0.85rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		background: var(--surface-raised);
		color: var(--forest);
		text-align: left;
		transition: border-color 150ms ease, background-color 150ms ease, transform 150ms ease;
	}
	.current-location:hover { border-color: hsl(138 48% 38% / 0.45); background: hsl(145 20% 95%); }
	.current-location.active { border-color: var(--forest); background: var(--mist); box-shadow: inset 0 0 0 1px var(--forest); }
	.current-location svg { width: 1.4rem; flex: none; fill: none; stroke: currentColor; stroke-width: 1.8; }
	.current-location span { min-width: 0; display: grid; gap: 0.15rem; }
	.current-location strong { font: 720 0.98rem/1.15 var(--font-display); }
	.current-location small { color: var(--text-secondary); font-size: 0.75rem; }
	.or-row { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 0.55rem; color: var(--text-secondary); font-size: 0.72rem; }
	.or-row span { height: 1px; background: var(--border-subtle); }
	.or-row b { font-weight: 650; }
	.search-field { position: relative; display: flex; align-items: center; }
	.search-field svg { position: absolute; z-index: 1; left: 0.9rem; width: 1.2rem; fill: none; stroke: var(--text-secondary); stroke-width: 1.8; pointer-events: none; }
	.search-field input {
		width: 100%;
		min-height: 3.25rem;
		padding: 0 1rem 0 2.8rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		background: var(--surface-raised);
		color: var(--text-primary);
		font-weight: 650;
		box-shadow: 0 0.35rem 1rem hsl(154 50% 20% / 0.05);
	}
	.search-field input[aria-invalid='true'] { border-color: hsl(2 70% 42%); box-shadow: 0 0 0 1px hsl(2 70% 42%); }
	.search-field input::placeholder { color: hsl(150 8% 48%); font-weight: 500; }
	.no-next-class {
		justify-self: start;
		padding: 0 0.85rem;
		border: 1px solid var(--border-subtle);
		border-radius: 999px;
		background: transparent;
		color: var(--text-secondary);
		font-weight: 700;
	}
	.no-next-class.active { border-color: hsl(154 20% 25% / 0.24); background: var(--mist); color: var(--forest); }
	.field-note { margin: -0.15rem 0 0; color: var(--text-secondary); font-size: 0.78rem; line-height: 1.45; }
	.preset-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0.45rem; }
	.preset-grid button {
		padding: 0.4rem;
		border: 1px solid var(--border-subtle);
		border-radius: 0.85rem;
		background: var(--surface-raised);
		color: var(--text-primary);
		font: 750 0.95rem/1 var(--font-body);
	}
	.preset-grid button small { display: block; margin-top: 0.15rem; color: var(--text-secondary); font-size: 0.62rem; font-weight: 600; }
	.preset-grid button.active { border-color: var(--forest); background: var(--forest); color: white; }
	.preset-grid button.active small { color: hsl(0 0% 100% / 0.7); }
	.custom-stepper { display: flex; align-items: center; justify-content: center; gap: 0.8rem; margin-top: 0.7rem; padding: 0.75rem; border-radius: var(--radius-md); background: var(--mist); }
	.custom-stepper > button { min-width: var(--tap-target); border: 1px solid var(--border-subtle); border-radius: 0.85rem; background: var(--surface-raised); color: var(--forest); font-size: 1.25rem; }
	.minutes { display: flex; align-items: baseline; gap: 0.3rem; }
	.minutes input { width: 3.6ch; padding: 0; border: 0; background: transparent; color: var(--forest); font: 780 2.25rem/1 var(--font-display); font-variant-numeric: tabular-nums; }
	.minutes small { color: var(--text-secondary); font-weight: 700; }
	.preference-control { border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: hsl(45 50% 98% / 0.75); }
	.preference-control summary { display: flex; min-height: var(--tap-target); align-items: center; justify-content: space-between; gap: 1rem; padding: 0.7rem 0.9rem; color: var(--forest); cursor: pointer; list-style-position: inside; }
	.preference-control summary { list-style: none; }
	.preference-control summary::-webkit-details-marker { display: none; }
	.preference-control summary::after { content: '›'; color: var(--text-secondary); transform: rotate(90deg); }
	.preference-control[open] summary::after { transform: rotate(-90deg); }
	.preference-control summary span { font: 720 0.8rem/1 var(--font-display); letter-spacing: 0.04em; text-transform: uppercase; }
	.preference-control summary strong { margin-left: auto; color: var(--text-accent); font-size: 0.85rem; }
	.cravings { padding: 0 0.8rem 0.8rem; }
	.chips { display: flex; gap: 0.5rem; overflow-x: auto; padding: 0.15rem 0.1rem 0.25rem; scrollbar-width: none; }
	.chips::-webkit-scrollbar { display: none; }
	.chips label { flex: 0 0 auto; }
	.chips input { position: absolute; opacity: 0; pointer-events: none; }
	.chips span { display: grid; place-items: center; min-height: var(--tap-target); padding: 0 1rem; border: 1px solid var(--border-subtle); border-radius: 999px; background: var(--surface-raised); font-weight: 680; white-space: nowrap; }
	.chips label.active span { border-color: var(--forest); background: var(--forest); color: white; }
	.find-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		min-height: 3.5rem;
		border: 0;
		border-radius: 1.05rem;
		background: var(--forest);
		color: white;
		font: 760 1.05rem/1 var(--font-display);
		letter-spacing: 0.02em;
		box-shadow: 0 0.75rem 1.5rem hsl(154 76% 13% / 0.2);
		transition: transform 160ms ease, background-color 160ms ease;
	}
	.find-button:hover { background: var(--forest-deep); transform: translateY(-2px); }
	.find-button:active { transform: translateY(0); }
	.find-button:disabled { opacity: 0.72; cursor: wait; }
	.find-button svg { width: 1.5rem; fill: none; stroke: currentColor; stroke-width: 2; }
	.status { min-height: 1.25rem; margin: -0.6rem 0 0; color: var(--text-secondary); font-size: 0.8rem; line-height: 1.4; }
	.privacy-note { display: flex; gap: 0.5rem; align-items: start; max-width: 46rem; margin: 0.9rem 0 0; color: var(--text-secondary); font-size: 0.76rem; line-height: 1.45; }
	.privacy-note svg { width: 1.15rem; flex: none; margin-top: 0.05rem; fill: none; stroke: var(--forest); stroke-width: 1.8; }
	@media (min-width: 720px) {
		.planner { padding: 2rem; }
		.planner-fields { grid-template-columns: 1fr 1fr; column-gap: 1.25rem; }
		.break-control, .preference-control, .find-button, .status { grid-column: 1 / -1; }
		.break-control { max-width: 38rem; }
		.find-button { max-width: 24rem; justify-self: start; width: 100%; }
	}
	@media (max-width: 420px) {
		.planner { padding: 1.25rem; border-radius: 1.5rem; }
		.preset-grid { grid-template-columns: repeat(4, 1fr); }
		.preset-grid button:last-child { grid-column: 1 / -1; }
	}
	@media (prefers-reduced-motion: reduce) { .find-button, .current-location { transition: none; } }
</style>
