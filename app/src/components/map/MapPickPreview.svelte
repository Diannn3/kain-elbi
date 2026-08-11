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
	const fitLabel = $derived(rank === 1 ? 'Top route fit' : `Route fit #${rank}`);
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
	<p class="mobile-metrics">
		{walkMinutes} min walk · {detourMinutes === undefined ? 'One-way' : `+${detourMinutes} min detour`} · {availableMinutes} min available
	</p>

	<dl class="metrics" aria-label={`Route metrics for ${pick.place.name}`}>
		<div><dt>Walk</dt><dd>{walkMinutes}<small>min</small></dd></div>
		<div><dt>{detourMinutes === undefined ? 'Route' : 'Detour'}</dt><dd>{detourMinutes === undefined ? 'One-way' : `+${detourMinutes}`}{#if detourMinutes !== undefined}<small>min</small>{/if}</dd></div>
		<div><dt>Available</dt><dd>{availableMinutes}<small>min</small></dd></div>
	</dl>

	<div class="preview-bottom">
		<p class="availability" data-status={pick.availability}><span aria-hidden="true"></span>{statusLabel}</p>
		<button type="button" onclick={onDetails} aria-label={`Details for ${pick.place.name}`}><span class="details-label">Details</span> <span aria-hidden="true">→</span></button>
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
	.fit-label { padding: 0.4rem 0.58rem; border-radius: 999px; background: var(--color-accent-on-dark); color: var(--color-primary); }
	.category { max-width: 42%; overflow: hidden; color: var(--color-text-accent); text-overflow: ellipsis; white-space: nowrap; }
	h2 { margin: 0.65rem 0 0; color: var(--color-primary); font: 780 clamp(1.35rem, 5vw, 1.8rem)/1 var(--font-display); text-wrap: balance; }
	.mobile-metrics { display: none; }
	.metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 0.85rem 0 0; border: 1px solid var(--color-border); border-radius: 0.9rem; background: var(--color-surface-raised); overflow: hidden; }
	.metrics div { min-width: 0; padding: 0.62rem 0.4rem; text-align: center; }
	.metrics div + div { border-left: 1px solid var(--color-border); }
	.metrics dt { color: var(--color-text-muted); font-size: 0.61rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
	.metrics dd { margin: 0.2rem 0 0; color: var(--color-primary); font: 780 1.05rem/1 var(--font-display); font-variant-numeric: tabular-nums; }
	.metrics small { margin-left: 0.12rem; color: var(--color-text-muted); font: 650 0.58rem/1 var(--font-body); text-transform: uppercase; }
	.preview-bottom { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-top: 0.8rem; }
	.availability { display: flex; min-width: 0; align-items: center; gap: 0.45rem; margin: 0; color: var(--color-text-muted); font-size: 0.72rem; font-weight: 650; }
	.availability > span { width: 0.5rem; height: 0.5rem; flex: none; border-radius: 50%; background: var(--color-status-warning); }
	.availability[data-status='open_at_arrival'] > span { background: var(--color-status-success); }
	.availability[data-status='closes_during_stop'] > span { background: var(--color-status-warning); }
	.availability[data-status='closed_at_arrival'] > span { background: var(--color-status-error); }
	button { min-width: 6.5rem; min-height: var(--tap-target); padding: 0 0.8rem; border: 0; border-radius: 0.8rem; background: var(--color-primary); color: white; font: 740 0.78rem/1 var(--font-display); }
	button:hover { background: var(--color-primary-hover); }

	@media (max-width: 759px) {
		.map-preview {
			position: relative;
			width: 100%;
			padding: 0.72rem 4.3rem 0.72rem 0.78rem;
			border-radius: 1rem;
		}
		.preview-topline { justify-content: flex-start; gap: 0.45rem; }
		.fit-label { padding: 0.3rem 0.48rem; font-size: 0.58rem; }
		.category { max-width: 48%; font-size: 0.6rem; }
		h2 {
			margin-top: 0.38rem;
			overflow: hidden;
			font-size: 1rem;
			line-height: 1.05;
			text-overflow: ellipsis;
			white-space: nowrap;
			text-wrap: nowrap;
		}
		.metrics { display: none; }
		.mobile-metrics {
			display: block;
			margin: 0.32rem 0 0;
			overflow: hidden;
			color: var(--color-text-muted);
			font-size: 0.68rem;
			line-height: 1.2;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.preview-bottom { margin-top: 0.42rem; }
		.availability { font-size: 0.66rem; }
		button {
			position: absolute;
			right: 0.72rem;
			bottom: 0.72rem;
			width: var(--tap-target);
			height: var(--tap-target);
			min-width: var(--tap-target);
			padding: 0;
			border-radius: 50%;
			font-size: 1rem;
		}
		.details-label { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
	}
	@media (min-width: 760px) { .map-preview { padding: 1.1rem; } }
</style>
