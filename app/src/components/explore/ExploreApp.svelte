<script lang="ts">
	import ExploreMap from './ExploreMap.svelte';
	import type { Collection, FoodZone, Place } from '../../lib/types';
	import { appStorage } from '../../lib/storage.svelte';

	let { places, zones, collections, routablePlaceIds, initialQuery = '', initialZone = '', initialCategory = '', initialCollection = '' }: {
		places: Place[]; zones: FoodZone[]; collections: Collection[]; routablePlaceIds: string[]; initialQuery?: string; initialZone?: string; initialCategory?: string; initialCollection?: string;
	} = $props();

	const injectedCollections = $derived([
		...collections,
		...(appStorage.savedPlaces.size > 0 ? [{ id: 'saved-places', title: '⭐ Saved Places', placeIds: Array.from(appStorage.savedPlaces) }] : [])
	]);

	const categoryLabels: Record<string, string> = { cafe: 'Café', restaurant: 'Meals', fast_food: 'Quick bites', food_court: 'Food court', bakery_deli: 'Bakery', kiosk_stall: 'Stalls', other: 'Other' };
	const routable = new Set(routablePlaceIds);
	const zoneForPlace = new Map<string, FoodZone>();
	for (const zone of zones) for (const id of zone.placeIds) zoneForPlace.set(id, zone);
	let query = $state(initialQuery);
	let zoneId = $state(initialZone);
	let category = $state(initialCategory);
	let collectionId = $state(initialCollection);
	let view = $state<'list' | 'map'>('list');
	let selectedId = $state('');
	let mapFailed = $state(false);

	const normalizedQuery = $derived(query.trim().toLowerCase());
	const activeCollection = $derived(injectedCollections.find((item) => item.id === collectionId));
	const collectionPlaces = $derived(new Set(activeCollection?.placeIds ?? []));
	const filtered = $derived(places.filter((place) => {
		if (place.recordStatus === 'closed' || !place.name) return false;
		if (zoneId && zoneForPlace.get(place.id)?.id !== zoneId) return false;
		if (category && place.category !== category) return false;
		if (collectionId && !collectionPlaces.has(place.id)) return false;
		if (!normalizedQuery) return true;
		const zone = zoneForPlace.get(place.id)?.name ?? '';
		return [place.name, categoryLabels[place.category] ?? '', zone, ...place.cuisine].join(' ').toLowerCase().includes(normalizedQuery);
	}));
	const selected = $derived(filtered.find((place) => place.id === selectedId));

	function syncUrl() {
		const params = new URLSearchParams();
		if (query.trim()) params.set('q', query.trim());
		if (zoneId) params.set('zone', zoneId);
		if (category) params.set('category', category);
		if (collectionId) params.set('collection', collectionId);
		if (view === 'map') params.set('view', 'map');
		history.replaceState({}, '', `/explore${params.size ? `?${params}` : ''}`);
	}
	function setView(next: 'list' | 'map') { view = next; localStorage.setItem('kain-elbi-explore-view', next); syncUrl(); }
	function changeFilters() { selectedId = ''; syncUrl(); }
	$effect(() => { if (typeof window === 'undefined') return; const url = new URL(location.href); if (url.searchParams.get('view') === 'map') view = 'map'; else { const saved = localStorage.getItem('kain-elbi-explore-view'); if (saved === 'map') view = 'map'; } });
</script>

<section class="explore-shell">
	<div class="toolbar">
		<label class="search">
			<span class="sr-only">Search food or places</span>
			<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" /></svg>
			<input type="search" bind:value={query} oninput={changeFilters} placeholder="Search food, places, or areas…" />
		</label>
		<div class="chips" aria-label="Food category filters">
			<button class:active={!category} onclick={() => { category=''; changeFilters(); }}>All</button>
			{#each ['restaurant','cafe','fast_food','bakery_deli'] as key}
				<button class:active={category===key} onclick={() => { category=key; changeFilters(); }}>{categoryLabels[key]}</button>
			{/each}
		</div>
		<div class="select-row">
			<label class="zone-select">Area<select bind:value={zoneId} onchange={changeFilters}><option value="">All areas</option>{#each zones as zone}<option value={zone.id}>{zone.name} · {zone.placeCount}</option>{/each}</select></label>
			<label class="zone-select">Browse list<select bind:value={collectionId} onchange={changeFilters}><option value="">All places</option>{#each injectedCollections as collection}<option value={collection.id}>{collection.title}</option>{/each}</select></label>
		</div>
	</div>

	<div class="result-bar">
		<div><strong>{filtered.length}</strong> places <span>· {activeCollection ? 'Research-backed browse list · ' : ''}Explore does not rank food quality.</span></div>
		<div class="segmented" aria-label="Explore view"><button class:active={view==='list'} onclick={() => setView('list')}>List</button><button class:active={view==='map'} onclick={() => setView('map')}>Map</button></div>
	</div>

	{#if view === 'list' || mapFailed}
		<div class="grid" aria-live="polite">
			{#each filtered as place (place.id)}
				{@const zone = zoneForPlace.get(place.id)}
				<article class="explore-card">
					<div class="meta"><span>{categoryLabels[place.category]}</span>{#if zone}<span>{zone.shortName}</span>{/if}</div>
					<h2><a href={`/place/${place.id}`}>{place.name}</a></h2>
					{#if place.cuisine.length}<p class="tags">{place.cuisine.slice(0,3).join(' · ')}</p>{/if}
					<p class="coverage">{routable.has(place.id) ? 'Campus route coverage available' : 'Explore listing · campus route coverage unavailable'}</p>
					<a class="open" href={`/place/${place.id}`}>View place <span aria-hidden="true">→</span></a>
				</article>
			{/each}
			{#if filtered.length === 0}<div class="empty"><h2>No matches yet.</h2><p>Try another name, category, or area.</p><button onclick={() => { query=''; zoneId=''; category=''; collectionId=''; changeFilters(); }}>Clear filters</button></div>{/if}
		</div>
	{:else}
		<div class="map-wrap">
			<ExploreMap places={filtered} {selectedId} onSelect={(place) => selectedId = place.id} onUnavailable={() => mapFailed = true} />
			{#if selected}<aside class="preview"><span>{categoryLabels[selected.category]} · {zoneForPlace.get(selected.id)?.shortName ?? 'Los Baños'}</span><strong>{selected.name}</strong><small>{routable.has(selected.id) ? 'Campus route coverage available' : 'Explore listing'}</small><a href={`/place/${selected.id}`}>View details →</a></aside>{/if}
		</div>
	{/if}
</section>

<style>
	.explore-shell { display: grid; gap: 1rem; }
	.toolbar {
		display: grid;
		gap: 0.85rem;
		padding: 1rem;
		border: 1px solid rgb(255 249 241 / 0.84);
		border-radius: 1.5rem;
		background: rgb(255 249 241 / 0.94);
		box-shadow: 0 1rem 2.8rem rgb(71 12 17 / 0.16);
		backdrop-filter: blur(20px);
	}
	.search { position: relative; display: flex; align-items: center; }
	.search svg { position: absolute; z-index: 1; left: 1.15rem; width: 1.35rem; fill: none; stroke: var(--brand-maroon-deep); stroke-width: 1.8; pointer-events: none; }
	.search input {
		width: 100%;
		min-height: 4rem;
		padding: 0 1.2rem 0 3.35rem;
		border: 1px solid var(--color-border);
		border-radius: 1.15rem;
		background: var(--brand-cream);
		color: var(--brand-charcoal);
		font-size: clamp(1rem, 2vw, 1.08rem);
		font-weight: 620;
		box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.8);
	}
	.search input::placeholder { color: var(--color-text-muted); font-weight: 500; }
	.chips { display: flex; gap: 0.5rem; overflow-x: auto; padding: 0.1rem 0 0.2rem; scrollbar-width: none; }
	.chips::-webkit-scrollbar { display: none; }
	.chips button,
	.segmented button {
		min-height: var(--tap-target);
		padding: 0 0.95rem;
		border: 1px solid var(--color-border);
		border-radius: 999px;
		background: var(--brand-sand);
		color: var(--brand-maroon-deep);
		font-weight: 720;
		white-space: nowrap;
	}
	.chips button:nth-child(odd):not(.active) { background: var(--brand-cream); }
	.chips button.active,
	.segmented button.active { border-color: var(--brand-maroon-deep); background: var(--brand-maroon-deep); color: var(--brand-cream); }
	.select-row { display: grid; grid-template-columns: 1fr; gap: 0.65rem; }
	.zone-select { display: grid; gap: 0.35rem; color: var(--color-text-muted); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
	.zone-select select { min-height: var(--tap-target); padding: 0 0.85rem; border: 1px solid var(--color-border); border-radius: 0.95rem; background: var(--brand-cream); color: var(--brand-charcoal); text-transform: none; letter-spacing: 0; }
	.result-bar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.1rem 0.1rem 0; color: var(--brand-charcoal); }
	.result-bar strong { color: var(--brand-maroon-deep); }
	.result-bar span { color: var(--color-text-muted); font-size: 0.85rem; }
	.segmented { display: grid; grid-template-columns: 1fr 1fr; padding: 0.2rem; border: 1px solid var(--color-border); border-radius: 999px; background: var(--brand-sand); }
	.segmented button { min-height: 2.5rem; border: 0; background: transparent; }
	.grid { display: grid; gap: 0.9rem; }
	.explore-card {
		padding: 1.2rem;
		border: 1px solid var(--color-border);
		border-radius: 1.25rem;
		background: var(--brand-cream);
		box-shadow: 0 0.5rem 1.4rem rgb(71 12 17 / 0.04);
		content-visibility: auto;
		contain-intrinsic-size: 14rem;
	}
	.explore-card:nth-child(even) { background: var(--brand-sand); }
	.meta { display: flex; gap: 0.5rem; flex-wrap: wrap; color: var(--brand-maroon-deep); font: 760 0.68rem/1 var(--font-display); letter-spacing: 0.07em; text-transform: uppercase; }
	.meta span + span::before { content: '·'; margin-right: 0.5rem; color: var(--color-text-muted); }
	h2 { margin: 0.65rem 0 0; color: var(--brand-maroon-deep); font: 770 clamp(1.4rem, 5vw, 1.8rem)/1 var(--font-display); }
	h2 a { text-decoration: none; }
	.tags,
	.coverage { margin: 0.55rem 0 0; color: var(--color-text-muted); line-height: 1.4; }
	.coverage { font-size: 0.8rem; }
	.open { display: inline-flex; align-items: center; min-height: var(--tap-target); margin-top: 0.7rem; color: var(--brand-maroon-deep); font-weight: 760; text-decoration: none; }
	.open span { margin-left: 0.25rem; color: var(--brand-orange); }
	.map-wrap { position: relative; min-height: 65dvh; overflow: hidden; border: 1px solid var(--color-border); border-radius: 1.5rem; background: var(--brand-sand); box-shadow: 0 0.8rem 2rem rgb(71 12 17 / 0.08); }
	.preview { position: absolute; z-index: 2; right: 0.8rem; bottom: 0.8rem; left: 0.8rem; display: grid; gap: 0.35rem; padding: 1rem; border: 1px solid rgb(255 249 241 / 0.82); border-radius: 1.1rem; background: rgb(255 249 241 / 0.96); box-shadow: 0 1rem 2rem rgb(71 12 17 / 0.18); backdrop-filter: blur(14px); }
	.preview span,
	.preview small { color: var(--color-text-muted); font-size: 0.75rem; }
	.preview strong { color: var(--brand-maroon-deep); font: 760 1.25rem/1.05 var(--font-display); }
	.preview a { justify-self: start; min-height: 2.5rem; display: flex; align-items: center; color: var(--brand-maroon-deep); font-weight: 760; }
	.empty { grid-column: 1 / -1; padding: 2rem; border: 1px dashed var(--color-border-strong); border-radius: 1.25rem; background: var(--brand-sand); text-align: center; }
	.empty h2 { margin: 0; }
	.empty p { color: var(--color-text-muted); }
	.empty button { min-height: var(--tap-target); padding: 0 1rem; border: 0; border-radius: 0.9rem; background: var(--brand-maroon-deep); color: var(--brand-cream); font-weight: 740; }
	@media (min-width: 760px) {
		.toolbar { grid-template-columns: 1fr auto; align-items: end; padding: 1.15rem; }
		.search { grid-column: 1 / -1; }
		.select-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.zone-select { min-width: 15rem; }
		.grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.preview { left: auto; width: min(24rem, calc(100% - 1.6rem)); }
	}
</style>
