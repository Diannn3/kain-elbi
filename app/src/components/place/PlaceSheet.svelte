<script lang="ts">
	import type { Place, SmartPick } from '../../lib/types';

	let {
		place,
		pick,
		open,
		onClose,
	}: { place: Place; pick?: SmartPick; open: boolean; onClose: () => void } = $props();
	let closeButton = $state<HTMLButtonElement>();
	let hoursStatus = $state('');

	const categoryNames: Record<string, string> = {
		cafe: 'Café',
		restaurant: 'Restaurant',
		fast_food: 'Quick Bite',
		food_court: 'Food Court',
		bakery_deli: 'Bakery & Sweets',
		kiosk_stall: 'Kiosk & Stall',
		other: 'Food Place',
	};

	function handleKeydown(event: KeyboardEvent) {
		if (!open) return;
		if (event.key === 'Escape') onClose();
		if (event.key !== 'Tab') return;
		const dialog = closeButton?.closest('[role="dialog"]');
		if (!dialog) return;
		const focusable = Array.from(
			dialog.querySelectorAll<HTMLElement>('button, a[href], select, input, [tabindex]:not([tabindex="-1"])'),
		);
		if (focusable.length === 0) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	$effect(() => {
		if (open) queueMicrotask(() => closeButton?.focus());
	});

	$effect(() => {
		if (!open) return;
		if (!place.openingHours) {
			hoursStatus = 'Hours unavailable';
			return;
		}
		hoursStatus = 'Checking source-listed hours…';
		let active = true;
		import('opening_hours')
			.then(({ default: OpeningHours }) => {
				const parsed = new OpeningHours(place.openingHours!, {
					lat: place.lat,
					lon: place.lon,
					address: { country_code: 'ph', state: 'Laguna' },
				});
				if (active) hoursStatus = parsed.getState() ? 'Open now · based on source-listed hours' : 'Closed now · based on source-listed hours';
			})
			.catch(() => { if (active) hoursStatus = 'Hours need checking'; });
		return () => { active = false; };
	});

	const sourceNames = $derived(
		Array.from(new Set(place.sources.map((source) => source.source.toUpperCase()))),
	);
	const directionsUrl = $derived(
		`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`,
	);
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="backdrop" role="presentation" onclick={(event) => event.currentTarget === event.target && onClose()}>
		<div class="sheet" role="dialog" aria-modal="true" aria-label={`${place.name} details`}>
			<div class="handle" aria-hidden="true"></div>
			<button class="close" type="button" aria-label="Close place details" bind:this={closeButton} onclick={onClose}>
				<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" /></svg>
			</button>

			<header>
				<p class="eyebrow"><span>{categoryNames[place.category]}</span><span>Candidate place record</span></p>
				<h2>{place.name}</h2>
				{#if pick}
					<p class="time"><strong>{Math.round(pick.timeRemainingSeconds / 60)} min</strong> available at this place</p>
				{/if}
			</header>

			<div class="rule"></div>
			<section>
				<h3>Why It Fits</h3>
				<p>{pick?.explanation ?? 'Open this place from Smart Picks to see its route-fit explanation.'}</p>
			</section>

			<section class="confidence">
				<h3>Data Confidence</h3>
				<strong>{place.confidenceLabel}</strong>
				<p>
					Found in {sourceNames.length ? sourceNames.join(' & ') : 'the candidate dataset'}.
					This is open-data evidence, not a field verification.
				</p>
				<ul>
					{#each place.sources as source}
						<li><span>{source.source.toUpperCase()}</span> <code>{source.sourceId}</code></li>
					{/each}
				</ul>
			</section>

			<section>
				<h3>Hours</h3>
				<p>{hoursStatus}</p>
				{#if place.openingHours}<small>{place.openingHours}</small>{/if}
			</section>

			<a class="directions" href={directionsUrl} target="_blank" rel="noreferrer">
				Open External Directions
				<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M14 5h5v5m0-5-8 8M5 7v12h12v-5" /></svg>
			</a>
		</div>
	</div>
{/if}

<style>
	.backdrop { position: fixed; z-index: 100; inset: 0; display: grid; align-items: end; background: hsl(154 30% 8% / 0.45); backdrop-filter: blur(6px); }
	.sheet { position: relative; max-height: 92dvh; overflow-y: auto; overscroll-behavior: contain; padding: 1.25rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom)); border-radius: 1.75rem 1.75rem 0 0; background: hsl(45 44% 98% / 0.96); box-shadow: 0 -1rem 3rem hsl(154 40% 8% / 0.22); animation: sheet-in 220ms ease-out; }
	.handle { width: 3rem; height: 0.28rem; margin: 0 auto 1.25rem; border-radius: 1rem; background: hsl(154 10% 55%); }
	.close { position: absolute; top: 1rem; right: 1rem; display: grid; place-items: center; width: 2.75rem; height: 2.75rem; border: 1px solid hsl(154 20% 25% / 0.15); border-radius: 50%; background: white; color: var(--forest); }
	.close svg, .directions svg { width: 1.25rem; fill: none; stroke: currentColor; stroke-width: 2; }
	.eyebrow, h3 { margin: 0; color: var(--forest); font: 750 0.72rem/1.2 var(--font-display); letter-spacing: 0.1em; text-transform: uppercase; }
	.eyebrow { display: flex; flex-wrap: wrap; gap: 0.35rem 0.65rem; }
	.eyebrow span + span { color: var(--muted); }
	h2 { max-width: 17ch; margin: 0.55rem 0 0; color: var(--forest); font: 780 clamp(2rem, 9vw, 3.75rem)/0.95 var(--font-display); text-wrap: balance; }
	.time { margin: 1rem 0 0; color: var(--muted); }
	.time strong { color: var(--forest); font-variant-numeric: tabular-nums; }
	.rule { height: 1px; margin: 1.25rem 0; background: hsl(154 20% 25% / 0.14); }
	.sheet section { margin-top: 1.25rem; }
	.sheet section p { margin: 0.5rem 0 0; color: var(--muted); line-height: 1.6; }
	.sheet section small { display: block; margin-top: .35rem; color: var(--muted); }
	.confidence { padding: 1rem; border-radius: 1.25rem; background: var(--mist); }
	.confidence strong { display: block; margin-top: 0.55rem; color: var(--forest); }
	ul { margin: 0.8rem 0 0; padding: 0; list-style: none; }
	li { display: flex; gap: 0.5rem; min-width: 0; color: var(--muted); font-size: 0.76rem; }
	code { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.directions { display: flex; align-items: center; justify-content: center; gap: 0.65rem; min-height: 3.5rem; margin-top: 1.5rem; border-radius: 1rem; background: var(--forest); color: white; font: 740 1rem/1 var(--font-display); text-decoration: none; }
	:global(button:focus-visible), .directions:focus-visible { outline: 3px solid var(--sun); outline-offset: 3px; }
	@keyframes sheet-in { from { opacity: 0; transform: translateY(1.5rem); } }
	@media (min-width: 760px) {
		.backdrop { justify-items: end; align-items: stretch; }
		.sheet { width: min(30rem, 92vw); max-height: none; border-radius: 1.75rem 0 0 1.75rem; padding: 2rem; }
		.handle { display: none; }
	}
	@media (prefers-reduced-motion: reduce) { .sheet { animation: none; } }
</style>
