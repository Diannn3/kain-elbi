<script lang="ts">
	import { onMount } from 'svelte';
	import ExploreMap from './ExploreMap.svelte';
	import ExploreMapResults from './ExploreMapResults.svelte';
	import FoodEvents from './FoodEvents.svelte';
	import ExploreMobileFilters from './ExploreMobileFilters.svelte';
	import CommunityPulse from '../community/CommunityPulse.svelte';
	import type { Category, Collection, FoodEvent, FoodZone, MealTag, Place } from '../../lib/types';
	import { appStorage } from '../../lib/storage.svelte';
	import { STORAGE_KEYS } from '../../lib/storage-keys';
	import {
		parseExploreUrl,
		serializeExploreUrl,
		type ExploreBudgetFilter,
		type ExploreHoursFilter,
		type ExploreUrlState,
	} from '../../lib/explore-url';
	import { matchesPlaceQuery } from '../../lib/explore-search';
	import { evaluateExploreHours, exploreHoursLabel, type ExploreHoursStatus } from '../../lib/explore-hours';
	import { buildFilterSuggestions, type ExploreSuggestion } from '../../lib/explore-suggestions';
	import {
		formatPriceRange,
		isRecentlyAdded,
		placeFitsBudget,
	} from '../../lib/data/place-enrichment';
	import { formatAddedDate, formatResearchDate } from '../../lib/date-format';

	let { places, zones, collections, routablePlaceIds, events }: {
		places: Place[];
		zones: FoodZone[];
		collections: Collection[];
		routablePlaceIds: string[];
		events: FoodEvent[];
	} = $props();

	const injectedCollections = $derived([
		...collections,
		...(appStorage.savedPlaces.size > 0
			? [{ id: 'saved-places', title: 'Saved places', placeIds: Array.from(appStorage.savedPlaces) }]
			: []),
	]);

	const categoryLabels: Record<string, string> = {
		cafe: 'Café',
		restaurant: 'Meals',
		fast_food: 'Quick bites',
		food_court: 'Food court',
		bakery_deli: 'Bakery',
		kiosk_stall: 'Stalls',
		other: 'Other',
	};

	const mealTagOptions: Array<{ tag: MealTag; label: string }> = [
		{ tag: 'rice-meal', label: 'Rice meal' },
		{ tag: 'snack', label: 'Snack' },
		{ tag: 'coffee', label: 'Coffee' },
		{ tag: 'dessert', label: 'Dessert' },
		{ tag: 'heavy-meal', label: 'Heavy' },
		{ tag: 'quick-meal', label: 'Quick' },
		{ tag: 'bakery', label: 'Bakery' },
		{ tag: 'drinks', label: 'Drinks' },
	];

	const routable = new Set(routablePlaceIds);
	const zoneForPlace = new Map<string, FoodZone>();
	for (const zone of zones) for (const id of zone.placeIds) zoneForPlace.set(id, zone);

	let query = $state('');
	let zoneId = $state('');
	let category = $state<ExploreUrlState['category']>('');
	let collectionId = $state('');
	let hours = $state<ExploreHoursFilter>('');
	let budget = $state<ExploreBudgetFilter>('');
	let mealTags = $state<MealTag[]>([]);
	let view = $state<'list' | 'map'>('list');
	let selectedId = $state('');
	let surpriseId = $state('');
	let mapFailed = $state(false);
	let urlReady = $state(false);
	let visibleCount = $state(24);
	let surpriseAnnouncement = $state('');
	let mapAnnouncement = $state('');
	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	let hoursById = $state<Record<string, ExploreHoursStatus>>({});
	let hoursReady = $state(false);
	let hoursLoading = $state(false);
	let hoursError = $state('');

	const normalizedQuery = $derived(query.trim().toLowerCase());
	const isResultsMode = $derived(Boolean(
		normalizedQuery || zoneId || category || collectionId || hours || budget || mealTags.length
	));
	const activeCollection = $derived(injectedCollections.find((item) => item.id === collectionId));
	const collectionPlaces = $derived(new Set(activeCollection?.placeIds ?? []));
	const pricedPlaceCount = $derived(places.filter((place) => place.price).length);
	const hoursCapableCount = $derived(places.filter((place) => place.hasParseableHours).length);

	const filtered = $derived(places.filter((place) => {
		if (place.recordStatus === 'closed' || !place.name) return false;
		if (zoneId && zoneForPlace.get(place.id)?.id !== zoneId) return false;
		if (category && place.category !== category) return false;
		if (collectionId && !collectionPlaces.has(place.id)) return false;
		if (budget && !placeFitsBudget(place, budget)) return false;
		if (mealTags.length && !place.mealTags?.some((t) => mealTags.includes(t))) return false;

		if (hours) {
			if (!hoursReady) return false;
			const status = hoursById[place.id] ?? 'unknown';
			if (hours === 'open' && status !== 'open' && status !== 'closing') return false;
			if (hours === 'closing' && status !== 'closing') return false;
		}

		const zone = zoneForPlace.get(place.id)?.name ?? '';
		return matchesPlaceQuery(place, query, zone, categoryLabels[place.category] ?? '');
	}));

	const selected = $derived(filtered.find((place) => place.id === selectedId));
	const visiblePlaces = $derived(filtered.slice(0, visibleCount));
	const remainingCount = $derived(Math.max(0, filtered.length - visiblePlaces.length));
	const featuredZones = $derived(zones.filter((zone) => zone.id !== 'elsewhere-lb').slice(0, 6));
	const recentPlaces = $derived(
		places
			.filter((place) => place.recordStatus !== 'closed' && isRecentlyAdded(place))
			.sort((a, b) => (b.addedAt ?? '').localeCompare(a.addedAt ?? ''))
			.slice(0, 6),
	);
	const smartSuggestions = $derived(buildFilterSuggestions({
		query,
		category,
		zoneId,
		hours,
		budget,
		zones,
		pricedPlaceCount,
		hoursCapableCount,
	}));

	function currentUrlState(): ExploreUrlState {
		return { query, zoneId, category, collectionId, hours, budget, mealTags, view };
	}

	function urlOptions() {
		return {
			zones: new Set(zones.map((zone) => zone.id)),
			collections: new Set(injectedCollections.map((collection) => collection.id)),
		};
	}

	function applyUrlState(state: ExploreUrlState) {
		query = state.query;
		zoneId = state.zoneId;
		category = state.category;
		collectionId = state.collectionId;
		hours = state.hours;
		budget = state.budget;
		mealTags = state.mealTags;
		view = state.view;
		selectedId = '';
		surpriseId = '';
		visibleCount = 24;
		mapFailed = false;
		if (hours) void ensureHours();
	}

	function syncUrl(mode: 'push' | 'replace' = 'push') {
		if (!urlReady) return;
		const url = serializeExploreUrl(new URL(location.href), currentUrlState());
		history[mode === 'push' ? 'pushState' : 'replaceState'](
			history.state,
			'',
			url.pathname + url.search,
		);
	}

	function commitFilters() {
		selectedId = '';
		surpriseId = '';
		visibleCount = 24;
		mapFailed = false;
		syncUrl('push');
	}

	function changeQuery() {
		selectedId = '';
		surpriseId = '';
		visibleCount = 24;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => syncUrl('replace'), 160);
	}

	async function ensureHours() {
		if (hoursReady || hoursLoading) return;
		hoursLoading = true;
		hoursError = '';
		try {
			hoursById = await evaluateExploreHours(places);
		} catch {
			hoursById = {};
			hoursError = 'Hours filtering is temporarily unavailable.';
		} finally {
			hoursReady = true;
			hoursLoading = false;
		}
	}

	async function setHours(next: ExploreHoursFilter) {
		if (next && !hoursReady) await ensureHours();
		hours = next;
		commitFilters();
	}

	function setBudget(next: string) {
		const parsed = Number(next);
		budget = parsed === 100 || parsed === 150 || parsed === 200 ? parsed : '';
		commitFilters();
	}

	function applySuggestion(suggestion: ExploreSuggestion) {
		switch (suggestion.kind) {
			case 'category':
				category = suggestion.value;
				commitFilters();
				break;
			case 'zone':
				zoneId = suggestion.value;
				commitFilters();
				break;
			case 'hours':
				void setHours(suggestion.value);
				break;
			case 'budget':
				budget = suggestion.value;
				commitFilters();
				break;
		}
	}

	function setView(next: 'list' | 'map') {
		if (view === next) return;
		view = next;
		try {
			localStorage.setItem(STORAGE_KEYS.exploreView, next); // Legacy compatibility key.
		} catch {
			// View preference is optional in restricted storage contexts.
		}
		syncUrl('push');
	}

	function randomIndex(length: number) {
		if (length <= 1) return 0;
		if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
			const values = new Uint32Array(1);
			const ceiling = Math.floor(0x1_0000_0000 / length) * length;
			do crypto.getRandomValues(values); while (values[0] >= ceiling);
			return values[0] % length;
		}
		return Math.floor(Math.random() * length);
	}

	function surpriseMe() {
		if (filtered.length === 0) return;
		const candidates = filtered.length > 1 && selectedId
			? filtered.filter((place) => place.id !== selectedId)
			: filtered;
		const place = candidates[randomIndex(candidates.length)];
		if (!place) return;

		selectedId = place.id;
		surpriseId = place.id;
		surpriseAnnouncement = `Surprise pick: ${place.name}.`;

		if (view === 'map' && !mapFailed) return;

		const index = filtered.findIndex((candidate) => candidate.id === place.id);
		if (index >= visibleCount) visibleCount = Math.ceil((index + 1) / 24) * 24;

		requestAnimationFrame(() => requestAnimationFrame(() => {
			const card = Array.from(document.querySelectorAll<HTMLElement>('.explore-card'))
				.find((element) => element.dataset.placeId === place.id);
			if (!card) return;
			const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
			card.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
			card.querySelector<HTMLElement>('a')?.focus({ preventScroll: true });
		}));
	}

	function clearFilters() {
		query = '';
		zoneId = '';
		category = '';
		collectionId = '';
		hours = '';
		budget = '';
		mealTags = [];
		commitFilters();
	}

	onMount(() => {
		const sourceUrl = new URL(location.href);
		const parsed = parseExploreUrl(sourceUrl, urlOptions());
		if (!sourceUrl.searchParams.has('view')) {
			try {
				if (localStorage.getItem(STORAGE_KEYS.exploreView) === 'map') parsed.view = 'map';
			} catch {
				// View preference is optional in restricted storage contexts.
			}
		}

		applyUrlState(parsed);
		urlReady = true;

		const canonical = serializeExploreUrl(new URL(location.href), parsed);
		if (canonical.pathname + canonical.search !== location.pathname + location.search) {
			history.replaceState(history.state, '', canonical.pathname + canonical.search);
		}

		const surpriseRequested = sourceUrl.searchParams.get('surprise') === '1';
		if (surpriseRequested) {
			const cleaned = new URL(location.href);
			cleaned.searchParams.delete('surprise');
			history.replaceState(history.state, '', cleaned.pathname + cleaned.search);
			requestAnimationFrame(() => surpriseMe());
		}

		const releasePrepaint = requestAnimationFrame(() => {
			document.documentElement.removeAttribute('data-explore-prepaint');
		});

		const handlePopState = () => applyUrlState(
			parseExploreUrl(new URL(location.href), urlOptions()),
		);
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
			<svg aria-hidden="true" viewBox="0 0 24 24">
				<path d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
			</svg>
			<input
				type="search"
				name="q"
				autocomplete="off"
				bind:value={query}
				oninput={changeQuery}
				placeholder="Search food, places, or Elbi terms…"
			/>
		</label>

		{#if smartSuggestions.length}
			<div class="smart-suggestions" aria-label="Suggested filters">
				<span>Try:</span>
				{#each smartSuggestions as suggestion (suggestion.id)}
					<button type="button" onclick={() => applySuggestion(suggestion)}>
						{suggestion.label}
					</button>
				{/each}
			</div>
		{/if}

		<div class="chip-rail">
			<div class="chips" role="group" aria-label="Food category filters">
				<button
					class:active={!category}
					aria-pressed={!category}
					onclick={() => { category = ''; commitFilters(); }}
				>All</button>
				{#each ['restaurant', 'cafe', 'fast_food', 'bakery_deli'] as key}
					<button
						class:active={category === key}
						aria-pressed={category === key}
						onclick={() => { category = key as Category; commitFilters(); }}
					>{categoryLabels[key]}</button>
				{/each}
			</div>
		</div>

		<div class="meal-tag-rail" role="group" aria-label="Meal type filters">
			{#each mealTagOptions as item (item.tag)}
				<button
					type="button"
					class:active={mealTags.includes(item.tag)}
					aria-pressed={mealTags.includes(item.tag)}
					onclick={() => {
						mealTags = mealTags.includes(item.tag)
							? mealTags.filter((value) => value !== item.tag)
							: [...mealTags, item.tag];
						commitFilters();
					}}
				>{item.label}</button>
			{/each}
		</div>

		<ExploreMobileFilters
			{zones}
			collections={injectedCollections}
			{zoneId}
			{collectionId}
			{hours}
			{budget}
			{hoursCapableCount}
			{pricedPlaceCount}
			{hoursLoading}
			{hoursError}
			onZone={(value) => { zoneId = value; commitFilters(); }}
			onCollection={(value) => { collectionId = value; commitFilters(); }}
			onHours={(value) => void setHours(value)}
			onBudget={setBudget}
			onClear={clearFilters}
		/>

		{#if hoursCapableCount > 0}
			<div class="hours-rail">
			<span>Hours</span>
			<div class="hours-chips" role="group" aria-label="Opening hours filters">
				<button
					class:active={!hours}
					aria-pressed={!hours}
					onclick={() => void setHours('')}
				>Any</button>
				<button
					class:active={hours === 'open'}
					aria-pressed={hours === 'open'}
					onclick={() => void setHours('open')}
				>Open now</button>
				<button
					class:active={hours === 'closing'}
					aria-pressed={hours === 'closing'}
					onclick={() => void setHours('closing')}
				>Closing soon</button>
			</div>
			{#if hoursLoading}<small>Checking source-listed hours…</small>{/if}
			{#if hoursError}<small class="filter-error">{hoursError}</small>{/if}
		</div>
		{/if}

		<div class="select-row" class:withBudget={pricedPlaceCount > 0}>
			<label class="zone-select">
				Area
				<select name="zone" bind:value={zoneId} onchange={commitFilters}>
					<option value="">All areas</option>
					{#each zones as zone}
						<option value={zone.id}>{zone.name} · {zone.placeCount}</option>
					{/each}
				</select>
			</label>

			<label class="zone-select">
				Browse list
				<select name="collection" bind:value={collectionId} onchange={commitFilters}>
					<option value="">All places</option>
					{#each injectedCollections as collection}
						<option value={collection.id}>{collection.title}</option>
					{/each}
				</select>
			</label>

			{#if pricedPlaceCount > 0}
				<label class="zone-select">
					Budget
					<select
						name="budget"
						value={budget ? String(budget) : ''}
						onchange={(event) => setBudget(event.currentTarget.value)}
					>
						<option value="">Any budget</option>
						<option value="100">Online-listed meal ≤ ₱100</option>
						<option value="150">Online-listed meal ≤ ₱150</option>
						<option value="200">Online-listed meal ≤ ₱200</option>
					</select>
				</label>
			{/if}
		</div>
	</div>

	{#if !isResultsMode}
		<div class="editorial-discovery">
			<FoodEvents {events} />
			<CommunityPulse {places} {zones} />

			{#if recentPlaces.length}
				<section class="recent-section" aria-labelledby="recent-heading">
					<div class="section-heading">
						<div>
							<p class="eyebrow-global">Recently Added</p>
							<h2 id="recent-heading">New to UPPETITE.</h2>
						</div>
					</div>
					<div class="recent-grid">
						{#each recentPlaces as place}
							<a href={`/place/${place.id}`}>
								<span>Added {formatAddedDate(place.addedAt ?? '')}</span>
								<strong>{place.name}</strong>
								{#if place.price}<small>{formatPriceRange(place.price)} online-listed meal range</small>{/if}
								<b>View place →</b>
							</a>
						{/each}
					</div>
				</section>
			{/if}

			<section class="zone-section" aria-labelledby="zone-heading">
				<div class="section-heading">
					<div>
						<p class="eyebrow-global">Food Zones</p>
						<h2 id="zone-heading">Learn Elbi by area.</h2>
					</div>
				</div>
				<div class="zone-grid">
					{#each featuredZones as zone}
						<a
							class="zone-card"
							class:active={zoneId === zone.id}
							aria-current={zoneId === zone.id ? 'page' : undefined}
							href={`/explore?zone=${zone.id}`}
						>
							<span>{zone.placeCount} catalog places</span>
							<strong>{zone.name}</strong>
							<p>{zone.description}</p>
						</a>
					{/each}
				</div>
				<p class="zone-note">
					These are UPPETITE geographic labels for discovery, not official UPLB or municipal district boundaries.
				</p>
			</section>

			{#if collections.length}
				<section class="collection-section" aria-labelledby="collection-heading">
					<div class="section-heading">
						<div>
							<p class="eyebrow-global">Research-backed lists</p>
							<h2 id="collection-heading">Real places people are talking about, completely unranked.</h2>
						</div>
					</div>
					<div class="collection-grid">
						{#each collections as collection}
							<a
								class:active={collectionId === collection.id}
								aria-current={collectionId === collection.id ? 'page' : undefined}
								href={`/explore?collection=${collection.id}`}
							>
								<span>{collection.evidenceCount} public discussion sources reviewed</span>
								<strong>{collection.title}</strong>
								<p>{collection.description}</p>
								<small>Researched {formatResearchDate(collection.researchDate)}</small>
							</a>
						{/each}
					</div>
				</section>
			{/if}
		</div>
	{/if}

	<div class="result-bar">
		<div aria-live="polite">
			{#if hours && !hoursReady}
				<strong>Checking hours…</strong>
			{:else}
				<strong>{filtered.length}</strong> places
				<span>
					· {activeCollection ? 'Research-backed browse list · ' : ''}
					{budget ? 'Known online menu prices only · ' : ''}
					Explore helps you discover food, not rank it.
				</span>
			{/if}
		</div>
		<div class="result-actions">
			<button class="surprise-button" type="button" disabled={filtered.length === 0} onclick={surpriseMe}>
				<span aria-hidden="true">↝</span> Surprise me
			</button>
			<div class="segmented" role="group" aria-label="Explore view">
				<button class:active={view === 'list'} aria-pressed={view === 'list'} onclick={() => setView('list')}>List</button>
				<button class:active={view === 'map'} aria-pressed={view === 'map'} onclick={() => setView('map')}>Map</button>
			</div>
		</div>
	</div>

	<p class="contribute-cta">
		Know a place we’re missing? <a href="/contribute#add-place">Add it to UPPETITE →</a>
	</p>
	<p class="sr-only" aria-live="polite">{surpriseAnnouncement}</p>
	<p class="sr-only" aria-live="polite">{mapAnnouncement}</p>

	{#if !urlReady}
		<p class="preparing" role="status">Preparing Explore…</p>
	{:else if view === 'list' || mapFailed}
		<div class="grid">
			{#each visiblePlaces as place (place.id)}
				{@const zone = zoneForPlace.get(place.id)}
				{@const price = formatPriceRange(place.price)}
				{@const hoursStatus = hoursReady ? hoursById[place.id] : undefined}
				<article
					class="explore-card"
					class:surprise-selected={surpriseId === place.id}
					data-place-id={place.id}
				>
					<div class="meta">
						<span>{categoryLabels[place.category]}</span>
						{#if zone}<span>{zone.shortName}</span>{/if}
						{#if hoursStatus === 'open' || hoursStatus === 'closing'}
							<span class:closing={hoursStatus === 'closing'}>{exploreHoursLabel(hoursStatus)}</span>
						{/if}
						{#if place.addedAt && isRecentlyAdded(place)}<span class="new-badge">New</span>{/if}
					</div>
					<h2><a href={`/place/${place.id}`}>{place.name}</a></h2>
					{#if place.cuisine.length}<p class="tags">{place.cuisine.slice(0, 3).join(' · ')}</p>{/if}
					{#if price}<p class="price-line"><strong>{price}</strong> online-listed meal range</p>{/if}
					<p class="coverage">
						{routable.has(place.id)
							? 'Campus route coverage available'
							: 'Explore listing · campus route coverage unavailable'}
					</p>
					<a class="open" href={`/place/${place.id}`}>View place <span aria-hidden="true">→</span></a>
				</article>
			{/each}

			{#if filtered.length === 0 && !(hours && !hoursReady)}
				<div class="empty">
					<h2>No matches yet.</h2>
					<p>
						{budget
							? 'Try a higher budget or clear another filter. Places without known price ranges are not included.'
							: 'Try another name, category, area, or opening-hours filter.'}
					</p>
					<button onclick={clearFilters}>Clear filters</button>
				</div>
			{/if}
		</div>

		{#if remainingCount > 0}
			<div class="disclosure">
				<p>Showing {visiblePlaces.length} of {filtered.length} places.</p>
				<button onclick={() => visibleCount += 24}>
					Show {Math.min(24, remainingCount)} more <span aria-hidden="true">↓</span>
					<span class="sr-only"> — {remainingCount} remaining</span>
				</button>
			</div>
		{/if}
	{:else}
		<div class="map-view-stack">
			<div class="map-wrap">
				<ExploreMap
					places={filtered}
					{selectedId}
					onSelect={(place) => { selectedId = place.id; surpriseId = ''; mapAnnouncement = `${place.name} selected on the map.`; }}
					onUnavailable={() => mapFailed = true}
				/>
				{#if selected}
					<aside class="preview">
					<span>
						{categoryLabels[selected.category]} · {zoneForPlace.get(selected.id)?.shortName ?? 'Los Baños'}
					</span>
					<strong>{selected.name}</strong>
					{#if selected.price}<small>{formatPriceRange(selected.price)} online-listed meal range</small>{/if}
					<small>{routable.has(selected.id) ? 'Campus route coverage available' : 'Explore listing'}</small>
					<a href={`/place/${selected.id}`}>View details →</a>
					</aside>
				{/if}
			</div>
			<ExploreMapResults places={filtered} {selectedId} {visibleCount} {zoneForPlace} onSelect={(place, source) => { selectedId = place.id; surpriseId = ''; mapAnnouncement = `${place.name} selected from the ${source === 'keyboard' ? 'keyboard list' : 'map list'}.`; }} onShowMore={() => visibleCount += 24} />
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
	.search svg {
		position: absolute;
		z-index: 1;
		left: 1.15rem;
		width: 1.35rem;
		fill: none;
		stroke: var(--brand-maroon-deep);
		stroke-width: 1.8;
		pointer-events: none;
	}
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

	.smart-suggestions,
	.meal-tag-rail,
	.hours-rail,
	.hours-chips {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-wrap: wrap;
	}
	.smart-suggestions > span,
	.hours-rail > span {
		color: var(--color-text-muted);
		font: 720 0.7rem/1 var(--font-display);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.meal-tag-rail button,
	.smart-suggestions button,
	.hours-chips button {
		min-height: var(--tap-target);
		padding: 0 var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: 999px;
		background: var(--brand-cream);
		color: var(--brand-maroon-deep);
		font-weight: 700;
	}
	.meal-tag-rail button:hover,
	.smart-suggestions button:hover,
	.hours-chips button:hover { background: var(--brand-sand); }
	.meal-tag-rail button.active,
	.hours-chips button.active {
		border-color: var(--brand-maroon-deep);
		background: var(--brand-maroon-deep);
		color: var(--brand-cream);
	}
	.hours-rail small { color: var(--color-text-muted); font-size: 0.75rem; }
	.hours-rail .filter-error { color: var(--brand-maroon-deep); }

	.chip-rail { position: relative; min-width: 0; }
	.chip-rail::after {
		content: '';
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		width: 2rem;
		pointer-events: none;
		background: linear-gradient(90deg, transparent, rgb(255 249 241 / 0.96));
	}
	.chips {
		display: flex;
		gap: var(--space-2);
		overflow-x: auto;
		padding: var(--space-1) var(--space-6) var(--space-1) 0;
		scrollbar-width: thin;
	}
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
	.segmented button.active {
		border-color: var(--brand-maroon-deep);
		background: var(--brand-maroon-deep);
		color: var(--brand-cream);
	}

	.select-row { display: grid; grid-template-columns: 1fr; gap: var(--space-3); }
	.zone-select {
		display: grid;
		gap: var(--space-1);
		color: var(--color-text-muted);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.zone-select select {
		min-height: var(--tap-target);
		padding: 0 var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--brand-cream);
		color: var(--brand-charcoal);
		text-transform: none;
		letter-spacing: 0;
	}

	.editorial-discovery { display: grid; gap: var(--space-10); margin-top: var(--space-8); }
	.recent-grid,
	.zone-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
	.recent-grid a,
	.zone-card,
	.collection-grid a {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--brand-cream);
		text-decoration: none;
	}
	.recent-grid a {
		display: grid;
		align-content: start;
		gap: var(--space-2);
		min-height: 10rem;
		padding: var(--space-4);
	}
	.recent-grid a:nth-child(even) { background: var(--brand-sand); }
	.recent-grid span {
		color: var(--color-accent-text);
		font: 740 0.75rem/1 var(--font-display);
		letter-spacing: 0.07em;
		text-transform: uppercase;
	}
	.recent-grid strong { color: var(--brand-maroon-deep); font: 760 1.2rem/1.05 var(--font-display); }
	.recent-grid small { color: var(--color-text-muted); }
	.recent-grid b { margin-top: auto; color: var(--brand-maroon-deep); font-size: 0.8rem; }

	.zone-card {
		position: relative;
		min-width: 0;
		min-height: 11rem;
		overflow: hidden;
		padding: var(--space-5);
		box-shadow: 0 0.5rem 1.5rem rgb(71 12 17 / 0.045);
		transition: border-color 150ms ease, box-shadow 150ms ease;
	}
	.zone-card:nth-child(even) { background: var(--brand-sand); }
	.zone-card::before {
		content: '';
		position: absolute;
		top: var(--space-4);
		right: var(--space-4);
		width: 0.75rem;
		height: 0.75rem;
		border: 3px solid var(--brand-orange);
		border-radius: 50%;
		background: var(--brand-cream);
	}
	.zone-card::after {
		content: '';
		position: absolute;
		top: 1.75rem;
		right: 1.5rem;
		width: 3.5rem;
		height: 2px;
		background: repeating-linear-gradient(90deg, var(--brand-orange) 0 6px, transparent 6px 11px);
		transform: rotate(-18deg);
		transform-origin: right center;
		opacity: 0.75;
	}
	.zone-card span,
	.collection-grid span {
		color: var(--brand-maroon-deep);
		font: 740 0.68rem/1 var(--font-display);
		letter-spacing: 0.07em;
		text-transform: uppercase;
	}
	.zone-card strong {
		display: block;
		max-width: 12ch;
		margin: var(--space-6) 0 0;
		color: var(--brand-maroon-deep);
		font: 770 1.35rem/1 var(--font-display);
	}
	.zone-card p {
		max-width: 30ch;
		margin: var(--space-2) 0 0;
		color: var(--color-text-muted);
		font-size: 0.86rem;
		line-height: 1.45;
	}
	.zone-card:hover,
	.zone-card:focus-visible,
	.zone-card.active {
		border-color: var(--brand-maroon-deep);
		box-shadow: inset 3px 0 0 var(--brand-maroon-deep), 0 0.75rem 1.75rem rgb(71 12 17 / 0.08);
	}
	.zone-note { margin: var(--space-3) 0 0; color: var(--color-text-muted); font-size: 0.78rem; }

	.collection-grid { display: grid; gap: var(--space-3); }
	.collection-grid a {
		padding: var(--space-4);
		transition: border-color 150ms ease, box-shadow 150ms ease;
	}
	.collection-grid a:nth-child(even) { background: var(--brand-sand); }
	.collection-grid a:hover,
	.collection-grid a:focus-visible,
	.collection-grid a.active {
		border-color: var(--brand-maroon-deep);
		box-shadow: inset 3px 0 0 var(--brand-maroon-deep);
	}
	.collection-grid strong {
		display: block;
		margin: var(--space-2) 0 0;
		color: var(--brand-maroon-deep);
		font: 760 1.2rem/1.05 var(--font-display);
	}
	.collection-grid p { margin: var(--space-2) 0 0; color: var(--color-text-muted); font-size: 0.85rem; line-height: 1.45; }
	.collection-grid small { display: block; margin-top: var(--space-3); color: var(--color-text-muted); font-size: 0.75rem; }

	.result-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.1rem 0.1rem 0;
		color: var(--brand-charcoal);
	}
	.result-bar strong { color: var(--brand-maroon-deep); }
	.result-bar span { color: var(--color-text-muted); font-size: 0.85rem; }
	.result-actions { display: flex; align-items: center; justify-content: flex-end; gap: var(--space-2); flex-wrap: wrap; }
	.surprise-button {
		min-height: var(--tap-target);
		padding: 0 var(--space-4);
		border: 1px solid var(--brand-maroon-deep);
		border-radius: 999px;
		background: var(--brand-cream);
		color: var(--brand-maroon-deep);
		font-weight: 740;
		white-space: nowrap;
	}
	.surprise-button:hover:not(:disabled) { background: var(--brand-sand); }
	.surprise-button:disabled { opacity: 0.45; cursor: not-allowed; }
	.surprise-button > span { margin-right: 0.25rem; color: var(--brand-orange); font-size: 1rem; }
	.contribute-cta { margin: calc(var(--space-3) * -1) 0 0; color: var(--color-text-muted); font-size: 0.82rem; }
	.contribute-cta a { color: var(--brand-maroon-deep); font-weight: 720; text-underline-offset: 0.2em; }
	.segmented {
		display: grid;
		grid-template-columns: 1fr 1fr;
		padding: 0.2rem;
		border: 1px solid var(--color-border);
		border-radius: 999px;
		background: var(--brand-sand);
	}
	.segmented button { min-height: var(--tap-target); border: 0; background: transparent; }

	.grid { display: grid; min-width: 0; gap: var(--space-4); }
	.explore-card {
		min-width: 0;
		padding: var(--space-5);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--brand-cream);
		box-shadow: none;
		content-visibility: auto;
		contain-intrinsic-size: 14rem;
		animation: card-enter 140ms ease-out both;
	}
	.explore-card:nth-child(even) { background: var(--brand-sand); }
	.explore-card.surprise-selected {
		border-color: var(--brand-orange);
		box-shadow: 0 0 0 2px rgb(230 106 25 / 0.16), 0 0.75rem 1.8rem rgb(71 12 17 / 0.08);
	}
	.meta {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		color: var(--brand-maroon-deep);
		font: 760 0.68rem/1 var(--font-display);
		letter-spacing: 0.07em;
		text-transform: uppercase;
	}
	.meta span + span::before { content: '·'; margin-right: 0.5rem; color: var(--color-text-muted); }
	.meta .closing,
	.meta .new-badge { color: var(--brand-orange); }
	h2 { margin: 0.65rem 0 0; color: var(--brand-maroon-deep); font: 770 clamp(1.4rem, 5vw, 1.8rem)/1 var(--font-display); }
	h2 a { text-decoration: none; }
	.tags,
	.price-line,
	.coverage { margin: 0.55rem 0 0; color: var(--color-text-muted); line-height: 1.4; }
	.price-line { font-size: 0.86rem; }
	.price-line strong { color: var(--brand-maroon-deep); }
	.coverage { font-size: 0.8rem; }
	.open {
		display: inline-flex;
		align-items: center;
		min-height: var(--tap-target);
		margin-top: 0.7rem;
		color: var(--brand-maroon-deep);
		font-weight: 760;
		text-decoration: none;
	}
	.open span { margin-left: var(--space-1); color: var(--brand-orange); transition: transform 150ms ease; }
	.open:hover span,
	.open:focus-visible span { transform: translateX(4px); }

	.disclosure { display: grid; justify-items: center; gap: var(--space-2); margin-top: var(--space-4); text-align: center; }
	.disclosure p,
	.preparing { margin: 0; color: var(--color-text-muted); }
	.disclosure button {
		min-height: var(--tap-target);
		padding: 0 var(--space-5);
		border: 1px solid var(--brand-maroon-deep);
		border-radius: var(--radius-sm);
		background: var(--brand-maroon-deep);
		color: var(--brand-cream);
		font-weight: 760;
	}
	.map-wrap {
		position: relative;
		height: 65vh;
		height: 65dvh;
		overflow: hidden;
		border: 1px solid var(--color-border);
		border-radius: 1.5rem;
		background: var(--brand-sand);
		box-shadow: 0 0.8rem 2rem rgb(71 12 17 / 0.08);
	}
	.preview {
		position: absolute;
		z-index: 2;
		right: 0.8rem;
		bottom: 0.8rem;
		left: 0.8rem;
		display: grid;
		gap: 0.35rem;
		padding: 1rem;
		border: 1px solid rgb(255 249 241 / 0.82);
		border-radius: 1.1rem;
		background: rgb(255 249 241 / 0.96);
		box-shadow: 0 1rem 2rem rgb(71 12 17 / 0.18);
		backdrop-filter: blur(14px);
	}
	.preview span,
	.preview small { color: var(--color-text-muted); font-size: 0.75rem; }
	.preview strong { color: var(--brand-maroon-deep); font: 760 1.25rem/1.05 var(--font-display); }
	.preview a {
		justify-self: start;
		min-height: var(--tap-target);
		display: flex;
		align-items: center;
		color: var(--brand-maroon-deep);
		font-weight: 760;
	}
	.map-view-stack { display: grid; gap: var(--space-4); min-width: 0; }

	.empty {
		grid-column: 1 / -1;
		padding: 2rem;
		border: 1px dashed var(--color-border-strong);
		border-radius: 1.25rem;
		background: var(--brand-sand);
		text-align: center;
	}
	.empty h2 { margin: 0; }
	.empty p { color: var(--color-text-muted); }
	.empty button {
		min-height: var(--tap-target);
		padding: 0 1rem;
		border: 0;
		border-radius: 0.9rem;
		background: var(--brand-maroon-deep);
		color: var(--brand-cream);
		font-weight: 740;
	}

	@media (max-width: 759px) {
		.result-bar { align-items: flex-start; flex-direction: column; }
		.result-actions { width: 100%; justify-content: space-between; }
		.surprise-button { flex: 1; }
	}

	@media (min-width: 760px) {
		.toolbar { grid-template-columns: 1fr auto; align-items: end; padding: 1.15rem; }
		.search,
		.meal-tag-rail,
		.smart-suggestions,
		.hours-rail { grid-column: 1 / -1; }
		.select-row { grid-column: 1 / -1; grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.select-row.withBudget { grid-template-columns: repeat(3, minmax(0, 1fr)); }
		.zone-select { min-width: 0; }
		.grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.zone-grid,
		.collection-grid,
		.recent-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
		.preview { left: auto; width: min(24rem, calc(100% - 1.6rem)); }
		.map-view-stack { grid-template-columns: minmax(0, 2fr) minmax(17rem, 0.72fr); align-items: stretch; }
		.map-view-stack :global(.map-results) { height: 65dvh; }
	}

	@keyframes card-enter { from { opacity: 0; transform: translateY(4px); } }
	@media (prefers-reduced-motion: reduce) { .explore-card { animation: none !important; } }
</style>
