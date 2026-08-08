<script lang="ts">
	import { availabilityLabel } from '../../lib/place-availability';
	import { categoryLabel, cuisineSummary, sourceSummary } from '../../lib/place-presentation';
	import type { Place, SmartPick } from '../../lib/types';

	let {
		place,
		pick,
		open,
		onClose,
	}: { place?: Place; pick?: SmartPick; open: boolean; onClose: () => void } = $props();
	let dialog = $state<HTMLDialogElement>();
	let closeButton = $state<HTMLButtonElement>();
	let hoursStatus = $state('');

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) {
			if (typeof dialog.showModal === 'function') dialog.showModal();
			else dialog.setAttribute('open', '');
			queueMicrotask(() => closeButton?.focus());
		} else if (!open && dialog.open) {
			if (typeof dialog.close === 'function') dialog.close();
			else dialog.removeAttribute('open');
		}
	});

	$effect(() => {
		if (!open) return;
		if (pick) {
			hoursStatus = availabilityLabel(pick.availability);
			return;
		}
		if (!place) return;
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

	const directionsUrl = $derived(
		place ? `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}&travelmode=walking` : '',
	);
	const placeUrl = $derived(place ? `/place/${encodeURIComponent(place.id)}` : '');
	const cuisine = $derived(place ? cuisineSummary(place) : undefined);
	const listingSummary = $derived(place ? sourceSummary(place) : '');
	const walkMinutes = $derived(pick ? Math.max(0, Math.round(pick.walkToPlaceSeconds / 60)) : 0);
	const availableMinutes = $derived(pick ? Math.max(0, Math.round(pick.timeRemainingSeconds / 60)) : 0);
	const detourMinutes = $derived(pick?.detourSeconds === undefined ? undefined : Math.max(0, Math.round(pick.detourSeconds / 60)));
	const availabilityTone = $derived(pick?.availability ?? 'unknown');
</script>

<dialog
	class="place-dialog"
	bind:this={dialog}
	aria-label={place ? `${place.name} details` : 'Place details'}
	aria-modal="true"
	oncancel={(event) => { event.preventDefault(); onClose(); }}
	onclick={(event) => { if (event.target === dialog) onClose(); }}
>
	{#if place}
		<div class="sheet-shell">
			<header class="sheet-header">
				<div class="title-copy">
					<p class="eyebrow">{categoryLabel(place.category)}{#if cuisine}<span aria-hidden="true"> · </span>{cuisine}{/if}</p>
					<h2>{place.name}</h2>
					<p class="availability" data-status={availabilityTone} aria-live="polite">
						<span aria-hidden="true"></span>{hoursStatus}
					</p>
				</div>
				<button class="close" type="button" aria-label="Close place details" bind:this={closeButton} onclick={onClose}>
					<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" /></svg>
				</button>
			</header>

			<div class="sheet-scroll">
				{#if pick}
					<dl class="route-metrics" aria-label={`Route metrics for ${place.name}`}>
						<div><dt>Walk</dt><dd>{walkMinutes}<small>min</small></dd></div>
						<div><dt>{detourMinutes === undefined ? 'Route' : 'Detour'}</dt><dd>{detourMinutes === undefined ? 'One-way' : `+${detourMinutes}`}{#if detourMinutes !== undefined}<small>min</small>{/if}</dd></div>
						<div><dt>Available</dt><dd>{availableMinutes}<small>min</small></dd></div>
					</dl>

					<section class="fit-card" aria-labelledby="why-fit-title">
						<p class="section-label">Route fit</p>
						<h3 id="why-fit-title">Why this fits your break</h3>
						<p>{pick.explanation}</p>
					</section>
				{/if}

				<section class="place-facts" aria-labelledby="place-facts-title">
					<p class="section-label">Place details</p>
					<h3 id="place-facts-title">About this place</h3>
					<dl>
						<div><dt>Type</dt><dd>{categoryLabel(place.category)}</dd></div>
						<div><dt>Hours</dt><dd>{hoursStatus}</dd></div>
						{#if cuisine}<div><dt>Food tags</dt><dd>{cuisine}</dd></div>{/if}
					</dl>
					{#if place.openingHours}
						<details class="hours-detail">
							<summary>View source-listed schedule</summary>
							<code>{place.openingHours}</code>
						</details>
					{/if}
				</section>

				<details class="listing-info">
					<summary>About this listing</summary>
					<div class="listing-body">
						<strong>{place.confidenceLabel}</strong>
						<p>{listingSummary}. Open-data evidence can change, so Kain does not treat this as field verification.</p>
						{#if place.sources.length}
							<ul aria-label="Listing data sources">
								{#each place.sources as source}
									<li><span>{source.source.toUpperCase()}</span><code>{source.sourceId}</code></li>
								{/each}
							</ul>
						{/if}
					</div>
				</details>
			</div>

			<footer class="sheet-actions">
				<a class="secondary" href={placeUrl}>Full place page</a>
				<a class="directions" href={directionsUrl} target="_blank" rel="noreferrer">
					Get directions
					<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M14 5h5v5m0-5-8 8M5 7v12h12v-5" /></svg>
				</a>
			</footer>
		</div>
	{/if}
</dialog>

<style>
	.place-dialog {
		position: fixed;
		inset: auto 0 0;
		width: 100%;
		max-width: none;
		max-height: 92dvh;
		margin: auto 0 0;
		padding: 0;
		border: 0;
		border-radius: var(--radius-xl) var(--radius-xl) 0 0;
		background: transparent;
		color: var(--text-primary);
		overflow: visible;
	}
	.place-dialog::backdrop { background: hsl(154 30% 8% / 0.5); backdrop-filter: blur(6px); }
	.sheet-shell {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) auto;
		max-height: 92dvh;
		border-radius: var(--radius-xl) var(--radius-xl) 0 0;
		background: hsl(45 50% 98% / 0.99);
		box-shadow: 0 -1rem 3rem hsl(154 40% 8% / 0.22);
		overflow: hidden;
		animation: sheet-in 220ms ease-out;
	}
	.sheet-header { display: flex; align-items: flex-start; gap: var(--space-4); padding: var(--space-6) var(--space-4) var(--space-4); }
	.title-copy { min-width: 0; flex: 1; }
	.eyebrow,
	.section-label { margin: 0; color: var(--text-accent); font: 760 0.7rem/1.25 var(--font-display); letter-spacing: 0.1em; text-transform: uppercase; }
	h2 { max-width: 18ch; margin: var(--space-2) 0 0; color: var(--forest); font: 790 clamp(2rem, 9vw, 3.6rem)/0.94 var(--font-display); text-wrap: balance; }
	.close { display: grid; place-items: center; width: var(--tap-target); height: var(--tap-target); flex: none; border: 1px solid var(--border-subtle); border-radius: 50%; background: white; color: var(--forest); }
	.close:hover { background: var(--surface-subtle); }
	.close svg,
	.directions svg { width: 1.2rem; fill: none; stroke: currentColor; stroke-width: 2; }
	.availability { display: flex; align-items: flex-start; gap: var(--space-2); margin: var(--space-3) 0 0; color: var(--text-secondary); font-size: 0.78rem; font-weight: 650; line-height: 1.4; }
	.availability > span { width: 0.55rem; height: 0.55rem; flex: none; margin-top: 0.25em; border-radius: 50%; background: hsl(40 85% 45%); }
	.availability[data-status='open_at_arrival'] > span { background: hsl(138 48% 32%); }
	.availability[data-status='closes_during_stop'] > span { background: hsl(32 90% 46%); }
	.availability[data-status='closed_at_arrival'] > span { background: hsl(2 68% 46%); }
	.sheet-scroll { min-height: 0; padding: 0 var(--space-4) var(--space-6); overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; }
	.route-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 0; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--surface-raised); overflow: hidden; }
	.route-metrics div { min-width: 0; padding: var(--space-3) var(--space-2); text-align: center; }
	.route-metrics div + div { border-left: 1px solid var(--border-subtle); }
	.route-metrics dt { color: var(--text-secondary); font-size: 0.66rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
	.route-metrics dd { margin: var(--space-1) 0 0; color: var(--forest); font: 790 clamp(1.15rem, 5vw, 1.45rem)/1 var(--font-display); font-variant-numeric: tabular-nums; }
	.route-metrics small { margin-left: 0.15rem; color: var(--text-secondary); font: 650 0.65rem/1 var(--font-body); text-transform: uppercase; }
	.fit-card,
	.place-facts { margin-top: var(--space-4); padding: var(--space-4); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); background: var(--surface-raised); }
	.fit-card { border-color: hsl(138 48% 30% / 0.2); background: hsl(138 34% 95%); }
	h3 { max-width: 26ch; margin: var(--space-2) 0 0; color: var(--forest); font: 760 1.2rem/1.1 var(--font-display); }
	.fit-card > p:last-child { margin: var(--space-3) 0 0; color: var(--text-primary); font-weight: 620; line-height: 1.55; }
	.place-facts > dl { margin: var(--space-3) 0 0; }
	.place-facts > dl > div { display: grid; grid-template-columns: 5.25rem minmax(0, 1fr); gap: var(--space-3); padding: var(--space-3) 0; border-top: 1px solid var(--border-subtle); }
	.place-facts dt { color: var(--text-secondary); font-size: 0.76rem; }
	.place-facts dd { margin: 0; color: var(--text-primary); font-weight: 650; line-height: 1.45; }
	.hours-detail { margin-top: var(--space-2); border-top: 1px solid var(--border-subtle); }
	.hours-detail summary,
	.listing-info > summary { display: flex; align-items: center; min-height: var(--tap-target); cursor: pointer; color: var(--forest); font-weight: 720; }
	.hours-detail code { display: block; padding: var(--space-3); border-radius: var(--radius-sm); background: var(--surface-subtle); color: var(--text-secondary); font-size: 0.74rem; white-space: normal; overflow-wrap: anywhere; }
	.listing-info { margin-top: var(--space-4); border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle); }
	.listing-body { padding: 0 0 var(--space-4); }
	.listing-body > strong { color: var(--forest); font: 730 0.9rem/1.2 var(--font-display); }
	.listing-body > p { margin: var(--space-2) 0 0; color: var(--text-secondary); font-size: 0.8rem; line-height: 1.55; }
	ul { display: grid; gap: var(--space-2); margin: var(--space-4) 0 0; padding: 0; list-style: none; }
	li { display: grid; grid-template-columns: 4.5rem minmax(0, 1fr); gap: var(--space-2); min-width: 0; color: var(--text-secondary); font-size: 0.72rem; }
	li span { color: var(--text-accent); font-weight: 750; }
	li code { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.sheet-actions { display: grid; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr); gap: var(--space-2); padding: var(--space-3) var(--space-4) calc(var(--space-3) + env(safe-area-inset-bottom)); border-top: 1px solid var(--border-subtle); background: hsl(45 50% 98% / 0.97); box-shadow: 0 -0.75rem 1.6rem hsl(154 35% 10% / 0.08); backdrop-filter: blur(14px); }
	.sheet-actions a { display: flex; align-items: center; justify-content: center; gap: var(--space-2); min-height: 3.5rem; padding: 0 var(--space-3); border-radius: var(--radius-md); font: 740 0.9rem/1 var(--font-display); text-align: center; text-decoration: none; }
	.secondary { border: 1px solid var(--border-subtle); background: var(--surface-raised); color: var(--forest); }
	.secondary:hover { background: var(--surface-subtle); }
	.directions { border: 1px solid var(--forest); background: var(--forest); color: white; }
	.directions:hover { background: var(--forest-deep); }
	@keyframes sheet-in { from { opacity: 0; transform: translateY(1.5rem); } }
	@media (min-width: 760px) {
		.place-dialog { inset: 0 0 0 auto; width: min(31rem, 92vw); height: 100dvh; max-height: 100dvh; margin: 0 0 0 auto; border-radius: var(--radius-xl) 0 0 var(--radius-xl); }
		.sheet-shell { height: 100dvh; max-height: 100dvh; border-radius: var(--radius-xl) 0 0 var(--radius-xl); animation-name: sheet-in-desktop; }
		.sheet-header { padding: var(--space-8) var(--space-6) var(--space-4); }
		.sheet-scroll { padding-inline: var(--space-6); }
		.sheet-actions { padding-inline: var(--space-6); }
	}
	@keyframes sheet-in-desktop { from { opacity: 0; transform: translateX(1.5rem); } }
	@media (max-width: 380px) {
		.sheet-actions { grid-template-columns: 1fr; }
		.secondary { order: 2; }
	}
	@media (prefers-reduced-motion: reduce) { .sheet-shell { animation: none; } }
</style>
