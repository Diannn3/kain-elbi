<script lang="ts">
	import type { SmartPick } from '../../lib/types';
	let { pick, rank, onDetails, mapHref }: { pick: SmartPick; rank: number; onDetails: (event: MouseEvent) => void; mapHref: string } = $props();

	const categoryNames: Record<string, string> = {
		cafe: 'Café', restaurant: 'Restaurant', fast_food: 'Quick Bite', food_court: 'Food Court',
		bakery_deli: 'Bakery & Sweets', kiosk_stall: 'Kiosk & Stall', other: 'Food Place',
	};
	const sourceNames = $derived(Array.from(new Set(pick.place.sources.map((source) => source.source.toUpperCase()))));
</script>

<article class="place-card">
	<div class="rank" aria-label={`Rank ${rank}`}>{rank}</div>
	<div class="card-main">
		<div class="card-title">
			<div>
				<p>{categoryNames[pick.place.category]}</p>
				<h2>{pick.place.name}</h2>
			</div>
			<strong><span>{Math.round(pick.timeRemainingSeconds / 60)}</span> min here</strong>
		</div>
		<p class="explanation">{pick.explanation}</p>
		<div class="signals">
			<span>{pick.place.openingHours ? 'Hours listed' : 'Hours unavailable'}</span>
			<span>{sourceNames.length ? sourceNames.join(' + ') : 'Limited source data'}</span>
		</div>
		<div class="actions">
			<button type="button" onclick={onDetails}>Details</button>
			<a href={mapHref}>View on Map <span aria-hidden="true">→</span></a>
		</div>
	</div>
</article>

<style>
	.place-card { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 0.85rem; padding: 1.1rem 0; border-top: 1px solid var(--line); content-visibility: auto; contain-intrinsic-size: 15rem; }
	.rank { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border-radius: 50%; background: var(--sun); color: var(--forest); font: 800 0.95rem/1 var(--font-display); }
	.card-main { min-width: 0; }
	.card-title { display: flex; align-items: start; justify-content: space-between; gap: 1rem; }
	.card-title p { margin: 0 0 0.35rem; color: var(--leaf); font: 750 0.66rem/1 var(--font-display); letter-spacing: 0.1em; text-transform: uppercase; }
	h2 { max-width: 18ch; margin: 0; color: var(--forest); font: 760 clamp(1.35rem, 5vw, 1.75rem)/1 var(--font-display); }
	.card-title strong { flex: 0 0 auto; color: var(--forest); font: 700 0.72rem/1.05 var(--font-display); text-align: right; text-transform: uppercase; }
	.card-title strong span { display: block; color: var(--leaf); font-size: 1.55rem; font-variant-numeric: tabular-nums; }
	.explanation { margin: 0.8rem 0 0; color: var(--ink); font-weight: 650; line-height: 1.45; }
	.signals { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.75rem; }
	.signals span { padding: 0.4rem 0.65rem; border-radius: 999px; background: var(--mist); color: var(--muted); font-size: 0.7rem; }
	.actions { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 0.9rem; }
	.actions button, .actions a { min-height: 2.75rem; padding: 0 0.9rem; border-radius: 0.8rem; font-weight: 720; }
	.actions button { border: 1px solid var(--line); background: var(--paper); color: var(--forest); }
	.actions a { display: grid; place-items: center; color: var(--forest); text-underline-offset: 0.2em; }
	.actions button:hover { background: var(--mist); }
	@media (min-width: 760px) { .place-card { gap: 1rem; padding: 1.4rem 0; } }
</style>
