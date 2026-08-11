<script lang="ts">
	import { formatPriceRange } from '../../lib/data/place-enrichment';
	import type { FoodZone, Place } from '../../lib/types';

	let { places, selectedId, visibleCount, zoneForPlace, onSelect, onShowMore }: {
		places: Place[];
		selectedId?: string;
		visibleCount: number;
		zoneForPlace: Map<string, FoodZone>;
		onSelect: (place: Place, source: 'pointer' | 'keyboard') => void;
		onShowMore: () => void;
	} = $props();

	const categoryLabels: Record<string, string> = {
		cafe: 'Café', restaurant: 'Meals', fast_food: 'Quick bites', food_court: 'Food court',
		bakery_deli: 'Bakery', kiosk_stall: 'Kiosk or stall', other: 'Food place',
	};
	const visible = $derived(places.slice(0, visibleCount));
	const remaining = $derived(Math.max(0, places.length - visible.length));
</script>

<aside class="map-results" aria-labelledby="map-results-heading">
	<header><p>Map places</p><h2 id="map-results-heading">Choose without relying on pins.</h2></header>
	<ol>
		{#each visible as place}
			<li>
				<button type="button" aria-pressed={selectedId === place.id} onclick={(event) => onSelect(place, event.detail === 0 ? 'keyboard' : 'pointer')}>
					<strong>{place.name}</strong>
					<span>{categoryLabels[place.category]} · {zoneForPlace.get(place.id)?.shortName ?? 'Los Baños'}</span>
					{#if place.price}<small>{formatPriceRange(place.price)} online-listed meal range</small>{/if}
				</button>
			</li>
		{/each}
	</ol>
	{#if remaining > 0}<button class="show-more" type="button" onclick={onShowMore}>Show {Math.min(24, remaining)} more <span class="sr-only">— {remaining} remaining</span></button>{/if}
</aside>

<style>
	.map-results { min-width: 0; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; gap: var(--space-3); padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface-raised); }
	header p, header h2 { margin: 0; }
	header p { color: var(--color-accent-text); font: 760 0.75rem/1 var(--font-display); letter-spacing: 0.08em; text-transform: uppercase; }
	header h2 { margin-top: var(--space-2); color: var(--color-primary); font: 760 1.15rem/1.1 var(--font-display); }
	ol { min-height: 0; display: grid; align-content: start; gap: var(--space-1); margin: 0; padding: 0; overflow-y: auto; list-style: none; overscroll-behavior: contain; }
	li { min-width: 0; }
	li button { width: 100%; min-height: var(--tap-target); display: grid; gap: var(--space-1); padding: var(--space-3); border: 0; border-left: 3px solid transparent; border-radius: var(--radius-sm); background: transparent; color: var(--color-text); text-align: left; }
	li button:hover, li button:focus-visible, li button[aria-pressed='true'] { border-left-color: var(--brand-orange); background: var(--color-surface-muted); }
	li strong { color: var(--color-primary); font: 720 0.9rem/1.2 var(--font-display); }
	li span, li small { color: var(--color-text-muted); font-size: 0.75rem; }
	.show-more { min-height: var(--tap-target); border: 1px solid var(--color-primary); border-radius: var(--radius-sm); background: var(--color-primary); color: var(--color-on-primary); font-weight: 740; }
	@media (max-width: 759px) { .map-results { max-height: 20rem; } }
</style>
