<script lang="ts">
	import { snapToNearestAnchor } from '../../lib/geo';
	import type { Anchor, Category } from '../../lib/types';

	let { anchors }: { anchors: Anchor[] } = $props();
	let breakMinutes = $state(45);
	let originId = $state('current');
	let destinationId = $state('');
	let preferredCategory = $state<Category | ''>('');
	let status = $state('');
	let locating = $state(false);

	const presets = [20, 30, 45, 60];
	const categories: { value: Category | ''; label: string }[] = [
		{ value: '', label: 'Any' },
		{ value: 'restaurant', label: 'Rice & meals' },
		{ value: 'cafe', label: 'Café' },
		{ value: 'fast_food', label: 'Quick bites' },
		{ value: 'bakery_deli', label: 'Bakery' },
	];

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
		if (originId !== 'current') return;
		event.preventDefault();
		if (!navigator.geolocation) {
			status = 'Location is unavailable. Choose a campus building to continue.';
			return;
		}

		locating = true;
		status = 'Finding the nearest campus anchor…';
		navigator.geolocation.getCurrentPosition(
			(position) => {
				const anchorRecord = Object.fromEntries(anchors.map((anchor) => [anchor.id, anchor]));
				const snap = snapToNearestAnchor(
					{ lat: position.coords.latitude, lon: position.coords.longitude },
					anchorRecord,
				);
				if (!snap) {
					locating = false;
					status = 'You are outside the supported campus area. Choose a building to continue.';
					return;
				}
				window.location.assign(buildUrl(snap.anchor.id, 'nearby', snap.approachSeconds));
			},
			() => {
				locating = false;
				status = 'Location permission was not granted. Choose a campus building to continue.';
			},
			{ enableHighAccuracy: false, maximumAge: 60_000, timeout: 8_000 },
		);
	}
</script>

<form class="planner" action="/picks" method="get" onsubmit={handleSubmit}>
	<div class="route-track" aria-hidden="true">
		<span class="route-node route-node--origin"></span>
		<span class="route-line"></span>
		<span class="route-node route-node--food">
			<svg viewBox="0 0 24 24"><path d="M7 3v8m3-8v8M5 3v5c0 2 1 3 3 3s3-1 3-3V3m5 0v18m0-18c3 2 4 5 4 8h-4" /></svg>
		</span>
		<span class="route-line route-line--lower"></span>
		<span class="route-node route-node--destination"></span>
	</div>

	<p class="eyebrow">Your Route</p>
	<div class="planner-fields">
		<label class="field">
			<span>From</span>
			<select name="origin" bind:value={originId} autocomplete="off" aria-label="Starting point" aria-describedby="location-note">
				<option value="current">Use Current Location</option>
				{#each anchors as anchor}
					<option value={anchor.id}>{anchor.name}</option>
				{/each}
			</select>
		</label>
		<input type="hidden" name="originMode" value={originId === 'current' ? 'nearby' : 'building'} />

		<label class="field">
			<span>Next Class <small>Optional</small></span>
			<select name="destination" bind:value={destinationId} autocomplete="off" aria-label="Next class building">
				<option value="">No Next Class</option>
				{#each anchors as anchor}
					<option value={anchor.id}>{anchor.name}</option>
				{/each}
			</select>
		</label>
		<p class="field-note">No next class? This becomes a one-way estimate; your return trip is not included.</p>

		<fieldset class="break-control">
			<legend>Break Time</legend>
			<div class="stepper">
				<button type="button" aria-label="Remove 5 minutes" onclick={() => adjustBreak(-5)}>−</button>
				<label class="minutes">
					<span class="sr-only">Break time in minutes</span>
					<input
						type="number"
						name="break"
						min="20"
						max="180"
						step="5"
						inputmode="numeric"
						aria-label="Break time in minutes"
						bind:value={breakMinutes}
					/>
					<small>min</small>
				</label>
				<button type="button" aria-label="Add 5 minutes" onclick={() => adjustBreak(5)}>+</button>
			</div>
			<div class="presets" aria-label="Break time presets">
				{#each presets as preset}
					<button
						type="button"
						class:active={breakMinutes === preset}
						aria-label={`Set break to ${preset} minutes`}
						onclick={() => (breakMinutes = preset)}>{preset}</button
					>
				{/each}
			</div>
		</fieldset>

		<fieldset class="cravings">
			<legend>Craving <small>Optional</small></legend>
			<div class="chips">
				{#each categories as category}
					<label class:active={preferredCategory === category.value}>
						<input type="radio" name="category" value={category.value} bind:group={preferredCategory} />
						<span>{category.label}</span>
					</label>
				{/each}
			</div>
		</fieldset>

		<button class="find-button" type="submit" disabled={locating}>
			{locating ? 'Finding Your Route…' : 'Find Food'}
			<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
		</button>
		<p class="status" aria-live="polite">{status}</p>
	</div>
</form>

<p class="privacy-note" id="location-note">
	<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Zm0 5v4m0 4h.01" /></svg>
	Your location is used once on this device and is not stored.
</p>

<style>
	.planner {
		position: relative;
		isolation: isolate;
		padding: 1.5rem 1rem 1rem 4.5rem;
		border: 1px solid hsl(0 0% 100% / 0.72);
		border-radius: 2rem;
		background: hsl(45 44% 99% / 0.72);
		box-shadow: 0 1.5rem 4rem hsl(154 76% 13% / 0.12);
		backdrop-filter: blur(22px) saturate(1.1);
	}
	.eyebrow,
	legend,
	.field > span {
		font-family: var(--font-display);
		font-size: 0.76rem;
		font-weight: 750;
		letter-spacing: 0.11em;
		text-transform: uppercase;
		color: var(--forest);
	}
	.eyebrow { margin: 0 0 1rem; }
	.planner-fields { display: grid; gap: 1rem; }
	.field { display: grid; gap: 0.4rem; }
	.field small,
	legend small { color: var(--muted); font: inherit; }
	select {
		width: 100%;
		min-height: 3.25rem;
		padding: 0 2.75rem 0 1rem;
		border: 1px solid hsl(154 20% 25% / 0.15);
		border-radius: 1rem;
		color: var(--ink);
		background-color: hsl(45 44% 99% / 0.92);
		font: 650 1rem/1 var(--font-body);
		box-shadow: 0 0.35rem 1rem hsl(154 50% 20% / 0.07);
	}
	.field-note { margin: -0.55rem 0 0; color: var(--muted); font-size: 0.78rem; line-height: 1.45; }
	fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
	legend { margin-bottom: 0.55rem; }
	.stepper { display: flex; align-items: center; gap: 0.65rem; }
	.stepper > button,
	.presets button {
		min-width: 2.75rem;
		min-height: 2.75rem;
		border: 1px solid hsl(154 20% 25% / 0.15);
		border-radius: 0.9rem;
		background: hsl(45 44% 99% / 0.82);
		color: var(--ink);
		font: 750 1rem/1 var(--font-body);
	}
	.minutes { display: flex; align-items: baseline; gap: 0.3rem; }
	.minutes input {
		width: 3.6ch;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--forest);
		font: 780 clamp(2.25rem, 11vw, 3.4rem)/1 var(--font-display);
		font-variant-numeric: tabular-nums;
	}
	.minutes small { color: var(--ink); font-weight: 700; }
	.presets { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-top: 0.65rem; }
	.presets button.active { background: var(--forest); color: white; border-color: var(--forest); }
	.chips { display: flex; gap: 0.5rem; overflow-x: auto; padding: 0.15rem 0.1rem 0.4rem; scrollbar-width: none; }
	.chips::-webkit-scrollbar { display: none; }
	.chips label { flex: 0 0 auto; }
	.chips input { position: absolute; opacity: 0; pointer-events: none; }
	.chips span {
		display: grid;
		place-items: center;
		min-height: 2.75rem;
		padding: 0 1rem;
		border: 1px solid hsl(154 20% 25% / 0.15);
		border-radius: 999px;
		background: hsl(45 44% 99% / 0.7);
		font-weight: 680;
		white-space: nowrap;
	}
	.chips label.active span { background: var(--forest); color: white; border-color: var(--forest); }
	.find-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		min-height: 3.5rem;
		border: 0;
		border-radius: 1.1rem;
		background: var(--forest);
		color: white;
		font: 760 1.05rem/1 var(--font-display);
		letter-spacing: 0.02em;
		box-shadow: 0 0.75rem 1.5rem hsl(154 76% 13% / 0.2);
		transition: transform 160ms ease, background-color 160ms ease;
	}
	.find-button:hover { background: hsl(154 76% 10%); transform: translateY(-2px); }
	.find-button:active { transform: translateY(0); }
	.find-button:disabled { opacity: 0.72; cursor: wait; }
	.find-button svg { width: 1.5rem; fill: none; stroke: currentColor; stroke-width: 2; }
	.status { min-height: 1.25rem; margin: -0.35rem 0 0; color: var(--muted); font-size: 0.78rem; }
	.privacy-note { display: flex; gap: 0.5rem; align-items: center; margin: 0.9rem 0 0; color: var(--muted); font-size: 0.76rem; }
	.privacy-note svg { width: 1.15rem; flex: none; fill: none; stroke: var(--forest); stroke-width: 1.8; }
	.route-track { position: absolute; z-index: -1; inset: 3.5rem auto 5.5rem 1rem; width: 2.8rem; display: flex; flex-direction: column; align-items: center; }
	.route-node { width: 1.05rem; height: 1.05rem; flex: none; border: 0.25rem solid white; border-radius: 50%; background: var(--leaf); box-shadow: 0 0.2rem 0.8rem hsl(154 76% 13% / 0.2); }
	.route-node--food { display: grid; place-items: center; width: 2.8rem; height: 2.8rem; border-width: 0.2rem; background: var(--sun); }
	.route-node--food svg { width: 1.25rem; fill: none; stroke: var(--forest); stroke-width: 1.8; }
	.route-line { width: 0.22rem; flex: 1; min-height: 2rem; background: linear-gradient(var(--leaf), var(--sun)); }
	.route-line--lower { background: linear-gradient(var(--sun), var(--leaf)); }
	.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
	:global(button:focus-visible), select:focus-visible, input:focus-visible, .chips input:focus-visible + span { outline: 3px solid var(--sun); outline-offset: 3px; }
	@media (min-width: 680px) {
		.planner { padding: 2rem 2rem 1.5rem 6rem; }
		.route-track { left: 1.55rem; }
		.planner-fields { grid-template-columns: 1fr 1fr; gap: 1.2rem; }
		.field-note { grid-column: 2; }
		.break-control, .cravings, .find-button, .status { grid-column: 1 / -1; }
		.break-control { display: grid; grid-template-columns: 1fr auto; align-items: end; column-gap: 1rem; }
		.break-control legend { grid-column: 1 / -1; }
		.presets { margin: 0; }
	}
	@media (max-width: 370px) {
		.planner { padding-left: 3.7rem; }
		.route-track { left: 0.7rem; }
	}
	@media (prefers-reduced-motion: reduce) {
		.find-button { transition: none; }
	}
</style>
