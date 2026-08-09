<script lang="ts">
	import { onMount } from 'svelte';
	import ExploreMap from './ExploreMap.svelte';
	import type { Collection, FoodZone, Place } from '../../lib/types';
	import { appStorage } from '../../lib/storage.svelte';
	import { parseExploreUrl, serializeExploreUrl, type ExploreUrlState } from '../../lib/explore-url';

	let { places, zones, collections, routablePlaceIds }: {
		places: Place[]; zones: FoodZone[]; collections: Collection[]; routablePlaceIds: string[];
	} = $props();

	const injectedCollections = $derived([
		...collections,
		...(appStorage.savedPlaces.size > 0 ? [{ id: 'saved-places', title: '⭐ Saved Places', placeIds: Array.from(appStorage.savedPlaces) }] : [])
	]);

	const categoryLabels: Record<string, string> = { cafe: 'Café', restaurant: 'Meals', fast_food: 'Quick bites', food_court: 'Food court', bakery_deli: 'Bakery', kiosk_stall: 'Stalls', other: 'Other' };
	const routable = new Set(routablePlaceIds);
	const zoneForPlace = new Map<string, FoodZone>();
	for (const zone of zones) for (const id of zone.placeIds) zoneForPlace.set(id, zone);
	let query = $state('');
	let zoneId = $state('');
	let category = $state<ExploreUrlState['category']>('');
	let collectionId = $state('');
	let view = $state<'list' | 'map'>('list');
	let selectedId = $state('');
	let mapFailed = $state(false);
	let urlReady = $state(false);
	let visibleCount = $state(24);
	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	const normalizedQuery = $derived(query.trim().toLowerCase());
	const isResultsMode = $derived(Boolean(normalizedQuery || zoneId || category || collectionId));
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
	const visiblePlaces = $derived(filtered.slice(0, visibleCount));
	const remainingCount = $derived(Math.max(0, filtered.length - visiblePlaces.length));
	const featuredZones = $derived(zones.filter((zone) => zone.id !== 'elsewhere-lb').slice(0, 6));

	function currentUrlState(): ExploreUrlState {
		return { query, zoneId, category, collectionId, view };
	}

	function urlOptions() {
		return { zones: new Set(zones.map((zone) => zone.id)), collections: new Set(injectedCollections.map((collection) => collection.id)) };
	}

	function applyUrlState(state: ExploreUrlState) {
		query = state.query;
		zoneId = state.zoneId;
		category = state.category;
		collectionId = state.collectionId;
		view = state.view;
		selectedId = '';
		visibleCount = 24;
		mapFailed = false;
	}

	function syncUrl(mode: 'push' | 'replace' = 'push') {
		if (!urlReady) return;
		const url = serializeExploreUrl(new URL(location.href), currentUrlState());
		history[mode === 'push' ? 'pushState' : 'replaceState'](history.state, '', url.pathname + url.search);
	}

	function commitFilters() {
		selectedId = '';
		visibleCount = 24;
		mapFailed = false;
		syncUrl('push');
	}

	function changeQuery() {
		selectedId = '';
		visibleCount = 24;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => syncUrl('replace'), 160);
	}

	function setView(next: 'list' | 'map') {
		if (view === next) return;
		view = next;
		try {
			localStorage.setItem('kain-elbi-explore-view', next); // Legacy compatibility key.
		} catch {
			// View preference is optional in restricted storage contexts.
		}
		syncUrl('push');
	}

	function clearFilters() {
		query = ''; zoneId = ''; category = ''; collectionId = '';
		commitFilters();
	}

	onMount(() => {
		const sourceUrl = new URL(location.href);
		const parsed = parseExploreUrl(sourceUrl, urlOptions());
		if (!sourceUrl.searchParams.has('view')) {
			try {
				if (localStorage.getItem('kain-elbi-explore-view') === 'map') parsed.view = 'map';
			} catch {
				// View preference is optional in restricted storage contexts.
			}
		}
		applyUrlState(parsed);
		urlReady = true;
		const canonical = serializeExploreUrl(new URL(location.href), parsed);
		if (canonical.pathname + canonical.search !== location.pathname + location.search) history.replaceState(history.state, '', canonical.pathname + canonical.search);

		const releasePrepaint = requestAnimationFrame(() => {
			document.documentElement.removeAttribute('data-explore-prepaint');
		});

		const handlePopState = () => applyUrlState(parseExploreUrl(new URL(location.href), urlOptions()));
		addEventListener('popstate', handlePopState);
		return () => {
			cancelAnimationFrame(releasePrepaint);
			document.documentElement.removeAttribute('data-explore-prepaint');
			removeEventListener('popstate', handlePopState);
			clearTimeout(searchTimer);
		};
	});
</script>

<section class="explore-shell">
	<div class="toolbar">
		<label class="search">
			<span class="sr-only">Search food or places</span>
			<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" /></svg>
			<input type="search" name="q" autocomplete="off" bind:value={query} oninput={changeQuery} placeholder="Search food, places, or areas…" />
		</label>
		<div class="chip-rail"><div class="chips" role="group" aria-label="Food category filters">
			<button class:active={!category} aria-pressed={!category} onclick={() => { category=''; commitFilters(); }}>All</button>
			{#each ['restaurant','cafe','fast_food','bakery_deli'] as key}
				<button class:active={category===key} aria-pressed={category===key} onclick={() => { category=key as ExploreUrlState['category']; commitFilters(); }}>{categoryLabels[key]}</button>
			{/each}
		</div></div>
		<div class="select-row">
			<label class="zone-select">Area<select name="zone" bind:value={zoneId} onchange={commitFilters}><option value="">All areas</option>{#each zones as zone}<option value={zone.id}>{zone.name} · {zone.placeCount}</option>{/each}</select></label>
			<label class="zone-select">Browse list<select name="collection" bind:value={collectionId} onchange={commitFilters}><option value="">All places</option>{#each injectedCollections as collection}<option value={collection.id}>{collection.title}</option>{/each}</select></label>
		</div>
	</div>

	{#if !isResultsMode}
		<div class="editorial-discovery">
			<section class="zone-section" aria-labelledby="zone-heading">
				<div class="section-heading"><div><p class="eyebrow-global">Food Zones</p><h2 id="zone-heading">Learn Elbi by area.</h2></div></div>
				<div class="zone-grid">
					{#each featuredZones as zone}
						<a class="zone-card" class:active={zoneId === zone.id} aria-current={zoneId === zone.id ? 'page' : undefined} href={`/explore?zone=${zone.id}`}>
							<span>{zone.placeCount} catalog places</span><strong>{zone.name}</strong><p>{zone.description}</p>
						</a>
					{/each}
				</div>
				<p class="zone-note">These are UPPETITE geographic labels for discovery, not official UPLB or municipal district boundaries.</p>
			</section>
			{#if collections.length}
				<section class="collection-section" aria-labelledby="collection-heading">
					<div class="section-heading"><div><p class="eyebrow-global">Community Curated Lists</p><h2 id="collection-heading">Real places people are talking about, completely unranked.</h2></div></div>
					<div class="collection-grid">
						{#each collections as collection}
							<a class:active={collectionId === collection.id} aria-current={collectionId === collection.id ? 'page' : undefined} href={`/explore?collection=${collection.id}`}><span>{collection.evidenceCount} community mentions</span><strong>{collection.title}</strong><p>{collection.description}</p></a>
						{/each}
					</div>
				</section>
			{/if}
		</div>
	{/if}

	<div class="result-bar">
		<div aria-live="polite"><strong>{filtered.length}</strong> places <span>· {activeCollection ? 'Research-backed browse list · ' : ''}Explore helps you discover food, not rank it.</span></div>
		<div class="segmented" role="group" aria-label="Explore view"><button class:active={view==='list'} aria-pressed={view==='list'} onclick={() => setView('list')}>List</button><button class:active={view==='map'} aria-pressed={view==='map'} onclick={() => setView('map')}>Map</button></div>
	</div>

	{#if !urlReady}
		<p class="preparing" role="status">Preparing Explore…</p>
	{:else if view === 'list' || mapFailed}
		<div class="grid">
			{#each visiblePlaces as place (place.id)}
				{@const zone = zoneForPlace.get(place.id)}
				<article class="explore-card">
					<div class="meta"><span>{categoryLabels[place.category]}</span>{#if zone}<span>{zone.shortName}</span>{/if}</div>
					<h2><a href={`/place/${place.id}`}>{place.name}</a></h2>
					{#if place.cuisine.length}<p class="tags">{place.cuisine.slice(0,3).join(' · ')}</p>{/if}
					<p class="coverage">{routable.has(place.id) ? 'Campus route coverage available' : 'Explore listing · campus route coverage unavailable'}</p>
					<a class="open" href={`/place/${place.id}`}>View place <span aria-hidden="true">→</span></a>
				</article>
			{/each}
			{#if filtered.length === 0}<div class="empty"><h2>No matches yet.</h2><p>Try another name, category, or area.</p><button onclick={clearFilters}>Clear filters</button></div>{/if}
		</div>
		{#if remainingCount > 0}<div class="disclosure"><p>Showing {visiblePlaces.length} of {filtered.length} places.</p><button onclick={() => visibleCount += 24}>Show {Math.min(24, remainingCount)} more <span aria-hidden="true">↓</span><span class="sr-only"> — {remainingCount} remaining</span></button></div>{/if}
	{:else}
		<div class="map-wrap">
			<ExploreMap places={filtered} {selectedId} onSelect={(place) => selectedId = place.id} onUnavailable={() => mapFailed = true} />
			{#if selected}<aside class="preview"><span>{categoryLabels[selected.category]} · {zoneForPlace.get(selected.id)?.shortName ?? 'Los Baños'}</span><strong>{selected.name}</strong><small>{routable.has(selected.id) ? 'Campus route coverage available' : 'Explore listing'}</small><a href={`/place/${selected.id}`}>View details →</a></aside>{/if}
		</div>
	{/if}
</section>

<style>
	.explore-shell { display: grid; min-width: 0; gap: var(--space-6); }
	.toolbar {
		display: grid;
		gap: var(--space-4);
		padding: var(--space-4);
		border: 1px solid rgb(255 249 241 / 0.84);
		border-radius: var(--radius-lg);
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
		border-radius: var(--radius-md);
		background: var(--brand-cream);
		color: var(--brand-charcoal);
		font-size: clamp(1rem, 2vw, 1.08rem);
		font-weight: 620;
		box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.8);
	}
	.search input::placeholder { color: var(--color-text-muted); font-weight: 500; }
	.chip-rail { position: relative; min-width: 0; }
	.chip-rail::after { content: ''; position: absolute; top: 0; right: 0; bottom: 0; width: 2rem; pointer-events: none; background: linear-gradient(90deg, transparent, rgb(255 249 241 / 0.96)); }
	.chips { display: flex; gap: var(--space-2); overflow-x: auto; padding: var(--space-1) var(--space-6) var(--space-1) 0; scrollbar-width: thin; }
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
	.select-row { display: grid; grid-template-columns: 1fr; gap: var(--space-3); }
	.zone-select { display: grid; gap: var(--space-1); color: var(--color-text-muted); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
	.zone-select select { min-height: var(--tap-target); padding: 0 var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--brand-cream); color: var(--brand-charcoal); text-transform: none; letter-spacing: 0; }
	.editorial-discovery { display: grid; gap: var(--space-10); margin-top: var(--space-8); }
	.zone-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
	.zone-card { position: relative; min-width: 0; min-height: 11rem; overflow: hidden; padding: var(--space-5); border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--brand-cream); box-shadow: 0 0.5rem 1.5rem rgb(71 12 17 / 0.045); text-decoration: none; transition: border-color 150ms ease, box-shadow 150ms ease; }
	.zone-card:nth-child(even) { background: var(--brand-sand); }
	.zone-card::before { content: ''; position: absolute; top: var(--space-4); right: var(--space-4); width: 0.75rem; height: 0.75rem; border: 3px solid var(--brand-orange); border-radius: 50%; background: var(--brand-cream); transition: transform 150ms ease; }
	.zone-card::after { content: ''; position: absolute; top: 1.75rem; right: 1.5rem; width: 3.5rem; height: 2px; background: repeating-linear-gradient(90deg, var(--brand-orange) 0 6px, transparent 6px 11px); transform: rotate(-18deg); transform-origin: right center; opacity: 0.75; }
	.zone-card span, .collection-grid span { color: var(--brand-maroon-deep); font: 740 0.68rem/1 var(--font-display); letter-spacing: 0.07em; text-transform: uppercase; }
	.zone-card strong { display: block; max-width: 12ch; margin: var(--space-6) 0 0; color: var(--brand-maroon-deep); font: 770 1.35rem/1 var(--font-display); }
	.zone-card p { max-width: 30ch; margin: var(--space-2) 0 0; color: var(--color-text-muted); font-size: 0.86rem; line-height: 1.45; }
	.zone-card:hover, .zone-card:focus-visible, .zone-card.active { border-color: var(--brand-maroon-deep); box-shadow: inset 3px 0 0 var(--brand-maroon-deep), 0 0.75rem 1.75rem rgb(71 12 17 / 0.08); }
	.zone-card:hover::before, .zone-card:focus-visible::before { transform: scale(1.04); }
	.zone-card:hover::after, .zone-card:focus-visible::after { animation: route-dash 700ms linear infinite; }
	.zone-note { margin: var(--space-3) 0 0; color: var(--color-text-muted); font-size: 0.78rem; }
	.collection-grid { display: grid; gap: var(--space-3); }
	.collection-grid a { padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--brand-cream); text-decoration: none; transition: border-color 150ms ease, box-shadow 150ms ease; }
	.collection-grid a:nth-child(even) { background: var(--brand-sand); }
	.collection-grid a:hover, .collection-grid a:focus-visible, .collection-grid a.active { border-color: var(--brand-maroon-deep); box-shadow: inset 3px 0 0 var(--brand-maroon-deep); }
	.collection-grid strong { display: block; margin: var(--space-2) 0 0; color: var(--brand-maroon-deep); font: 760 1.2rem/1.05 var(--font-display); }
	.collection-grid p { margin: var(--space-2) 0 0; color: var(--color-text-muted); font-size: 0.85rem; line-height: 1.45; }
	.result-bar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.1rem 0.1rem 0; color: var(--brand-charcoal); }
	.result-bar strong { color: var(--brand-maroon-deep); }
	.result-bar span { color: var(--color-text-muted); font-size: 0.85rem; }
	.segmented { display: grid; grid-template-columns: 1fr 1fr; padding: 0.2rem; border: 1px solid var(--color-border); border-radius: 999px; background: var(--brand-sand); }
	.segmented button { min-height: 2.5rem; border: 0; background: transparent; }
	.grid { display: grid; min-width: 0; gap: var(--space-4); }
	.explore-card {
		min-width: 0;
		padding: var(--space-5);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--brand-cream);
		box-shadow: 0 0.5rem 1.4rem rgb(71 12 17 / 0.04);
		content-visibility: auto;
		contain-intrinsic-size: 14rem;
		animation: card-enter 140ms ease-out both;
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
	.open span { margin-left: var(--space-1); color: var(--brand-orange); transition: transform 150ms ease; }
	.open:hover span, .open:focus-visible span { transform: translateX(4px); }
	.disclosure { display: grid; justify-items: center; gap: var(--space-2); margin-top: var(--space-4); text-align: center; }
	.disclosure p, .preparing { margin: 0; color: var(--color-text-muted); }
	.disclosure button { min-height: var(--tap-target); padding: 0 var(--space-5); border: 1px solid var(--brand-maroon-deep); border-radius: var(--radius-sm); background: var(--brand-maroon-deep); color: var(--brand-cream); font-weight: 760; }
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
		.zone-grid, .collection-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
		.preview { left: auto; width: min(24rem, calc(100% - 1.6rem)); }
	}
	@keyframes route-dash { to { background-position: 11px 0; } }
	@keyframes card-enter { from { opacity: 0; transform: translateY(4px); } }
	@media (prefers-reduced-motion: reduce) { .zone-card::after, .explore-card { animation: none !important; } }
</style>
