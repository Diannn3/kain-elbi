<script lang="ts">
	import { availabilityLabel } from '../../lib/place-availability';
	import type { SmartPick } from '../../lib/types';

	let {
		pick,
		rank,
		onDetails,
	}: {
		pick: SmartPick;
		rank: number;
		onDetails: (event: MouseEvent) => void;
	} = $props();

	const walkMinutes = $derived(Math.max(0, Math.round(pick.walkToPlaceSeconds / 60)));
	const availableMinutes = $derived(Math.max(0, Math.round(pick.timeRemainingSeconds / 60)));
	const detourMinutes = $derived(pick.detourSeconds === undefined ? undefined : Math.max(0, Math.round(pick.detourSeconds / 60)));
	const fitLabel = $derived(rank === 1 ? 'Best fit' : `Route fit #${rank}`);
	const statusLabel = $derived(
		pick.availability === 'unknown'
			? (pick.place.openingHours ? 'Hours need checking' : 'Hours unavailable')
			: availabilityLabel(pick.availability).split(' · ')[0],
	);
</script>

<article class="map-preview" aria-label={`${pick.place.name}, ${fitLabel}`}>
	<div class="preview-topline">
		<span class="fit-label">{fitLabel}</span>
		<span class="category">{pick.place.category.replaceAll('_', ' ')}</span>
	</div>
	<h2>{pick.place.name}</h2>

	<dl class="metrics" aria-label={`Route metrics for ${pick.place.name}`}>
		<div><dt>Walk</dt><dd>{walkMinutes}<small>min</small></dd></div>
		<div><dt>{detourMinutes === undefined ? 'Route' : 'Detour'}</dt><dd>{detourMinutes === undefined ? 'One-way' : `+${detourMinutes}`}{#if detourMinutes !== undefined}<small>min</small>{/if}</dd></div>
		<div><dt>Available</dt><dd>{availableMinutes}<small>min</small></dd></div>
	</dl>

	<div class="preview-bottom">
		<p class="availability" data-status={pick.availability}><span aria-hidden="true"></span>{statusLabel}</p>
		<button type="button" onclick={onDetails}>Details <span aria-hidden="true">→</span></button>
	</div>
</article>

<style>
	.map-preview {
		width: min(100%, 31rem);
		padding: 1rem;
		border: 1px solid hsl(0 0% 100% / 0.72);
		border-radius: 1.25rem;
		background: hsl(45 50% 98% / 0.96);
		box-shadow: 0 1rem 2.5rem hsl(154 55% 8% / 0.24);
		backdrop-filter: blur(18px);
	}
	.preview-topline { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
	.fit-label,
	.category { font: 760 0.65rem/1 var(--font-display); letter-spacing: 0.08em; text-transform: uppercase; }
	.fit-label { padding: 0.4rem 0.58rem; border-radius: 999px; background: var(--sun); color: var(--forest); }
	.category { max-width: 42%; overflow: hidden; color: var(--text-accent); text-overflow: ellipsis; white-space: nowrap; }
	h2 { margin: 0.65rem 0 0; color: var(--forest); font: 780 clamp(1.35rem, 5vw, 1.8rem)/1 var(--font-display); text-wrap: balance; }
	.metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 0.85rem 0 0; border: 1px solid var(--border-subtle); border-radius: 0.9rem; background: var(--surface-raised); overflow: hidden; }
	.metrics div { min-width: 0; padding: 0.62rem 0.4rem; text-align: center; }
	.metrics div + div { border-left: 1px solid var(--border-subtle); }
	.metrics dt { color: var(--text-secondary); font-size: 0.61rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
	.metrics dd { margin: 0.2rem 0 0; color: var(--forest); font: 780 1.05rem/1 var(--font-display); font-variant-numeric: tabular-nums; }
	.metrics small { margin-left: 0.12rem; color: var(--text-secondary); font: 650 0.58rem/1 var(--font-body); text-transform: uppercase; }
	.preview-bottom { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-top: 0.8rem; }
	.availability { display: flex; min-width: 0; align-items: center; gap: 0.45rem; margin: 0; color: var(--text-secondary); font-size: 0.72rem; font-weight: 650; }
	.availability > span { width: 0.5rem; height: 0.5rem; flex: none; border-radius: 50%; background: hsl(40 85% 45%); }
	.availability[data-status='open_at_arrival'] > span { background: hsl(138 48% 32%); }
	.availability[data-status='closes_during_stop'] > span { background: hsl(32 90% 46%); }
	.availability[data-status='closed_at_arrival'] > span { background: hsl(2 68% 46%); }
	button { min-width: 6.5rem; min-height: var(--tap-target); padding: 0 0.8rem; border: 0; border-radius: 0.8rem; background: var(--forest); color: white; font: 740 0.78rem/1 var(--font-display); }
	button:hover { background: var(--forest-deep); }
	@media (min-width: 760px) { .map-preview { padding: 1.1rem; } }
</style>
