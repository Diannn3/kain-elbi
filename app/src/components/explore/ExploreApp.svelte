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
		<label class="search"><span class="sr-only">Search food or places</span><input type="search" bind:value={query} oninput={changeFilters} placeholder="Search food, places, or areas…" /></label>
		<div class="chips" aria-label="Food category filters">
			<button class:active={!category} onclick={() => { category=''; changeFilters(); }}>All</button>
			{#each ['restaurant','cafe','fast_food','bakery_deli'] as key}
				<button class:active={category===key} onclick={() => { category=key; changeFilters(); }}>{categoryLabels[key]}</button>
			{/each}
		</div>
		<div class="select-row"><label class="zone-select">Area<select bind:value={zoneId} onchange={changeFilters}><option value="">All areas</option>{#each zones as zone}<option value={zone.id}>{zone.name} · {zone.placeCount}</option>{/each}</select></label><label class="zone-select">Browse list<select bind:value={collectionId} onchange={changeFilters}><option value="">All places</option>{#each injectedCollections as collection}<option value={collection.id}>{collection.title}</option>{/each}</select></label></div>
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
	.explore-shell{display:grid;gap:1rem}.toolbar{display:grid;gap:.8rem;padding:1rem;border:1px solid var(--border-subtle);border-radius:1.4rem;background:var(--surface-raised);box-shadow:0 .8rem 2rem hsl(154 50% 15%/.06)}
	.search input{width:100%;min-height:3.25rem;padding:0 1rem;border:1px solid var(--border-subtle);border-radius:1rem;background:white;color:var(--ink);font-size:1rem}.chips{display:flex;gap:.5rem;overflow:auto;padding-bottom:.15rem}.chips button,.segmented button{min-height:var(--tap-target);padding:0 .9rem;border:1px solid var(--border-subtle);border-radius:999px;background:white;color:var(--forest);font-weight:720;white-space:nowrap}.chips button.active,.segmented button.active{border-color:var(--forest);background:var(--forest);color:white}.select-row{display:grid;grid-template-columns:1fr;gap:.6rem}.zone-select{display:grid;gap:.35rem;color:var(--text-secondary);font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em}.zone-select select{min-height:var(--tap-target);padding:0 .8rem;border:1px solid var(--border-subtle);border-radius:.9rem;background:white;color:var(--ink);text-transform:none;letter-spacing:0}.result-bar{display:flex;align-items:center;justify-content:space-between;gap:1rem}.result-bar span{color:var(--text-secondary);font-size:.85rem}.segmented{display:grid;grid-template-columns:1fr 1fr;padding:.2rem;border:1px solid var(--border-subtle);border-radius:999px;background:var(--surface-raised)}.segmented button{min-height:2.5rem;border:0}.grid{display:grid;gap:.9rem}.explore-card{padding:1.15rem;border:1px solid var(--border-subtle);border-radius:1.25rem;background:hsl(45 50% 98%/.82);content-visibility:auto;contain-intrinsic-size:14rem}.meta{display:flex;gap:.5rem;flex-wrap:wrap;color:var(--text-accent);font:760 .68rem/1 var(--font-display);letter-spacing:.07em;text-transform:uppercase}.meta span+span::before{content:'·';margin-right:.5rem;color:var(--muted)}h2{margin:.65rem 0 0;color:var(--forest);font:770 clamp(1.4rem,5vw,1.8rem)/1 var(--font-display)}h2 a{text-decoration:none}.tags,.coverage{margin:.55rem 0 0;color:var(--text-secondary);line-height:1.4}.coverage{font-size:.8rem}.open{display:inline-flex;align-items:center;min-height:var(--tap-target);margin-top:.7rem;color:var(--forest);font-weight:760;text-decoration:none}.map-wrap{position:relative;min-height:65dvh;overflow:hidden;border:1px solid var(--border-subtle);border-radius:1.5rem;background:var(--mist)}.preview{position:absolute;z-index:2;right:.8rem;bottom:.8rem;left:.8rem;display:grid;gap:.35rem;padding:1rem;border:1px solid hsl(0 0% 100%/.7);border-radius:1.1rem;background:hsl(45 50% 98%/.94);box-shadow:0 1rem 2rem hsl(154 40% 8%/.18);backdrop-filter:blur(14px)}.preview span,.preview small{color:var(--text-secondary);font-size:.75rem}.preview strong{color:var(--forest);font:760 1.25rem/1.05 var(--font-display)}.preview a{justify-self:start;min-height:2.5rem;display:flex;align-items:center;color:var(--forest);font-weight:760}.empty{grid-column:1/-1;padding:2rem;border:1px dashed var(--border-subtle);border-radius:1.25rem;text-align:center}.empty h2{margin:0}.empty button{min-height:var(--tap-target);padding:0 1rem;border:0;border-radius:.9rem;background:var(--forest);color:white;font-weight:740}
	@media(min-width:760px){.toolbar{grid-template-columns:1fr auto;align-items:end}.search{grid-column:1/-1}.select-row{grid-template-columns:repeat(2,minmax(0,1fr))}.zone-select{min-width:15rem}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.preview{left:auto;width:min(24rem,calc(100% - 1.6rem))}}
</style>
