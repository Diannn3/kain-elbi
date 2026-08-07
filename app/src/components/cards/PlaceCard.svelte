<script lang="ts">
	import { availabilityLabel } from '../../lib/place-availability';
	import type { SmartPick } from '../../lib/types';

	let {
		pick,
		rank,
		onDetails,
		onMap,
	}: {
		pick: SmartPick;
		rank: number;
		onDetails: (event: MouseEvent) => void;
		onMap: (event: MouseEvent) => void;
	} = $props();

	const categoryNames: Record<string, string> = {
		cafe: 'Café',
		restaurant: 'Restaurant',
		fast_food: 'Quick Bite',
		food_court: 'Food Court',
		bakery_deli: 'Bakery & Sweets',
		kiosk_stall: 'Kiosk & Stall',
		other: 'Food Place',
	};
	const walkMinutes = $derived(Math.max(0, Math.round(pick.walkToPlaceSeconds / 60)));
	const availableMinutes = $derived(Math.max(0, Math.round(pick.timeRemainingSeconds / 60)));
	const detourMinutes = $derived(pick.detourSeconds === undefined ? undefined : Math.max(0, Math.round(pick.detourSeconds / 60)));
	const routeFitLabel = $derived(rank === 1 ? 'Best fit' : `Route fit #${rank}`);
	const statusLabel = $derived(
		pick.availability === 'unknown'
			? (pick.place.openingHours ? 'Hours need checking' : 'Hours unavailable')
			: availabilityLabel(pick.availability).split(' · ')[0],
	);
</script>

<article class="place-card" data-place-id={pick.place.id}>
	<div class="card-topline">
		<span class="fit-label">{routeFitLabel}</span>
		<span class="category">{categoryNames[pick.place.category]}</span>
	</div>

	<h2>{pick.place.name}</h2>

	<dl class="metrics" aria-label={`Route metrics for ${pick.place.name}`}>
		<div><dt>Walk</dt><dd>{walkMinutes}<small>min</small></dd></div>
		<div><dt>{detourMinutes === undefined ? 'Route' : 'Detour'}</dt><dd>{detourMinutes === undefined ? 'One-way' : `+${detourMinutes}`} {#if detourMinutes !== undefined}<small>min</small>{/if}</dd></div>
		<div><dt>Available</dt><dd>{availableMinutes}<small>min</small></dd></div>
	</dl>

	<p class="availability" data-status={pick.availability}>
		<span aria-hidden="true"></span>{statusLabel}
	</p>

	<div class="explanation-block">
		<strong>Why this fits</strong>
		<p>{pick.explanation}</p>
	</div>

	<div class="actions">
		<button type="button" class="details" onclick={onDetails}>Details</button>
		<button type="button" class="map-action" onclick={onMap}>Show on map <span aria-hidden="true">→</span></button>
	</div>
</article>

<style>
	.place-card {
		padding: 1.25rem;
		border: 1px solid var(--border-subtle);
		border-radius: 1.35rem;
		background: hsl(45 50% 98% / 0.82);
		box-shadow: 0 0.65rem 1.8rem hsl(154 50% 15% / 0.06);
		content-visibility: auto;
		contain-intrinsic-size: 19rem;
	}
	.card-topline { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem; }
	.fit-label,
	.category { font: 760 0.7rem/1 var(--font-display); letter-spacing: 0.08em; text-transform: uppercase; }
	.fit-label { padding: 0.42rem 0.62rem; border-radius: 999px; background: var(--sun); color: var(--forest); }
	.category { color: var(--text-accent); }
	h2 { max-width: 22ch; margin: 0.8rem 0 0; color: var(--forest); font: 770 clamp(1.55rem, 6vw, 2rem)/0.98 var(--font-display); }
	.metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0; margin: 1rem 0 0; border: 1px solid var(--border-subtle); border-radius: 1rem; background: var(--surface-raised); overflow: hidden; }
	.metrics div { min-width: 0; padding: 0.75rem 0.55rem; text-align: center; }
	.metrics div + div { border-left: 1px solid var(--border-subtle); }
	.metrics dt { color: var(--text-secondary); font-size: 0.68rem; font-weight: 650; text-transform: uppercase; letter-spacing: 0.06em; }
	.metrics dd { margin: 0.3rem 0 0; color: var(--forest); font: 780 clamp(1.1rem, 5vw, 1.4rem)/1 var(--font-display); font-variant-numeric: tabular-nums; }
	.metrics dd small { margin-left: 0.16rem; color: var(--text-secondary); font: 650 0.68rem/1 var(--font-body); text-transform: uppercase; }
	.availability { display: flex; align-items: center; gap: 0.5rem; margin: 0.8rem 0 0; color: var(--text-secondary); font-size: 0.78rem; font-weight: 650; }
	.availability > span { width: 0.55rem; height: 0.55rem; flex: none; border-radius: 50%; background: hsl(40 85% 45%); }
	.availability[data-status='open_at_arrival'] > span { background: hsl(138 48% 32%); }
	.availability[data-status='closes_during_stop'] > span { background: hsl(32 90% 46%); }
	.availability[data-status='closed_at_arrival'] > span { background: hsl(2 68% 46%); }
	.explanation-block { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle); }
	.explanation-block strong { color: var(--forest); font: 730 0.8rem/1 var(--font-display); text-transform: uppercase; letter-spacing: 0.06em; }
	.explanation-block p { margin: 0.45rem 0 0; color: var(--text-primary); font-weight: 620; line-height: 1.48; }
	.actions { display: grid; grid-template-columns: 0.8fr 1.2fr; gap: 0.65rem; margin-top: 1rem; }
	.actions button { display: grid; place-items: center; min-height: var(--tap-target); padding: 0 0.9rem; border-radius: 0.9rem; font-weight: 740; }
	.details { border: 1px solid var(--border-subtle); background: var(--surface-raised); color: var(--forest); }
	.map-action { border: 1px solid var(--forest); background: var(--forest); color: white; }
	.details:hover { background: var(--surface-subtle); }
	.map-action:hover { background: var(--forest-deep); }
	@media (min-width: 760px) { .place-card { padding: 1.5rem; } }
</style>
