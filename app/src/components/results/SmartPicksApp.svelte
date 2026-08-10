<script lang="ts">
	import { onMount } from 'svelte';
	import { loadAppData } from '../../lib/data/loaders';
	import { createPlaceSheetController, type PlaceSheetController } from '../../lib/place-sheet-controller';
	import { parseSearchParams, serializeSearchParams } from '../../lib/search-state';
	import { rankSmartPicks } from '../../lib/smart-picks';
	import { resolveSearchContext } from '../../lib/routing';
	import { buildRouteGeometry } from '../../lib/walk-graph';
	import type { Anchor, Category, RouteMatrix, SearchContext, SmartPick } from '../../lib/types';
	import PlaceCard from '../cards/PlaceCard.svelte';
	import MapCanvas from '../map/MapCanvas.svelte';
	import MapPickPreview from '../map/MapPickPreview.svelte';
	import PlaceSheet from '../place/PlaceSheet.svelte';
	import ShareButton from '../common/ShareButton.svelte';
	import { appStorage } from '../../lib/storage.svelte';

	type ResultsView = 'list' | 'map';
	const VIEW_STORAGE_KEY = 'kainElbiResultsView';

	let { initialView = 'list' }: { initialView?: ResultsView } = $props();
	let loading = $state(true);
	let error = $state('');
	let picks = $state<SmartPick[]>([]);
	let context = $state<SearchContext>();
	let matrix = $state<RouteMatrix>();
	let selected = $state<SmartPick>();
	let view = $state<ResultsView>(initialView);
	let focusedPickId = $state<string>();
	let mapFallback = $state(false);
	let routeCoordinates = $state<Array<[number, number]>>();
	let routeGeometryState = $state<'idle' | 'loading' | 'actual' | 'unavailable'>('idle');
	let listScrollY = 0;
	let contentRoot: HTMLElement;
	let contextBar: HTMLElement;
	let visibleCount = $state(12);
	let sheetController: PlaceSheetController<SmartPick> | undefined;

	const categoryOptions: { value?: Category; label: string }[] = [
		{ label: 'Any food' },
		{ value: 'restaurant', label: 'Rice & meals' },
		{ value: 'cafe', label: 'Café' },
		{ value: 'fast_food', label: 'Quick bites' },
		{ value: 'bakery_deli', label: 'Bakery' },
	];
	const breakOptions = [20, 30, 45, 60, 90];

	const origin = $derived(context && matrix ? matrix.anchors[context.originId] : undefined);
	const destination = $derived(context?.destinationId && matrix ? matrix.anchors[context.destinationId] : undefined);
	const originName = $derived(origin?.name ?? 'Loading route…');
	const destinationName = $derived(destination?.name ?? (context?.destinationId ? 'Selected destination' : 'No next class'));
	const categoryLabel = $derived(categoryOptions.find((option) => option.value === context?.preferredCategory)?.label ?? 'Any food');
	const focusedPick = $derived(picks.find((pick) => pick.place.id === focusedPickId));
	const focusedRank = $derived(focusedPick ? picks.findIndex((pick) => pick.place.id === focusedPick.place.id) + 1 : 0);
	const visiblePicks = $derived(picks.slice(0, visibleCount));
	const remainingPicks = $derived(Math.max(0, picks.length - visiblePicks.length));
	const routeSharePath = $derived(
		context ? `/picks?${serializeSearchParams(context).toString()}` : '/picks',
	);
	const routingNote = $derived(
		routeGeometryState === 'actual'
			? 'Solid route follows the Room TBA pedestrian graph, with short access connectors to the selected place.'
			: matrix?.schema_version === 2
				? 'Walking metrics use the Room TBA pedestrian graph plus supported access connectors. Path geometry is unavailable in this build, so the dashed line is simplified context.'
				: 'Walking metrics are still using the legacy estimate artifact. The dashed map line is geographic context only.',
	);
	const routingBadgeLabel = $derived(
		routeGeometryState === 'actual'
			? 'Solid Room TBA route'
			: routeGeometryState === 'loading'
				? 'Checking route'
				: matrix?.schema_version === 2 ? 'Simplified route' : 'Legacy route estimate',
	);

	$effect(() => {
		const currentMatrix = matrix;
		const currentOrigin = origin;
		const currentDestination = destination;
		const currentPick = focusedPick;
		if (view !== 'map' || !currentMatrix || currentMatrix.schema_version !== 2 || !currentOrigin || !currentPick) {
			routeCoordinates = undefined;
			routeGeometryState = 'idle';
			return;
		}
		let cancelled = false;
		routeGeometryState = 'loading';
		buildRouteGeometry(currentMatrix, currentOrigin, currentPick.place, currentDestination)
			.then((coordinates) => {
				if (cancelled) return;
				routeCoordinates = coordinates;
				routeGeometryState = coordinates?.length ? 'actual' : 'unavailable';
			})
			.catch(() => {
				if (cancelled) return;
				routeCoordinates = undefined;
				routeGeometryState = 'unavailable';
			});
		return () => { cancelled = true; };
	});

	function hrefFor(overrides: Partial<SearchContext> = {}) {
		if (!context) return '/picks';
		const next = { ...context, ...overrides };
		const params = serializeSearchParams(next);
		if (view === 'map') params.set('view', 'map');
		return `/picks?${params.toString()}`;
	}

	function replaceResultsUrl(nextView: ResultsView, focusId?: string) {
		if (typeof window === 'undefined') return;
		const url = new URL(window.location.href);
		url.pathname = '/picks';
		if (nextView === 'map') url.searchParams.set('view', 'map');
		else url.searchParams.delete('view');
		if (nextView === 'map' && focusId) url.searchParams.set('focus', focusId);
		else url.searchParams.delete('focus');
		window.history.replaceState(window.history.state ?? {}, '', url);
	}

	function setFocusedPick(pick: SmartPick) {
		focusedPickId = pick.place.id;
		if (view === 'map') replaceResultsUrl('map', pick.place.id);
	}

	function switchView(nextView: ResultsView, pick?: SmartPick) {
		if (typeof window === 'undefined') return;
		if (view === 'list') listScrollY = window.scrollY;
		if (pick) focusedPickId = pick.place.id;
		else if (nextView === 'map' && !focusedPickId) focusedPickId = picks[0]?.place.id;
		view = nextView;
		try { window.localStorage.setItem(VIEW_STORAGE_KEY, nextView); } catch { /* local preference is optional */ }
		replaceResultsUrl(nextView, nextView === 'map' ? focusedPickId : undefined);
		mapFallback = false;
		requestAnimationFrame(() => {
			if (nextView === 'map') {
				contextBar?.scrollIntoView({ block: 'start', behavior: 'auto' });
			} else {
				window.scrollTo({ top: listScrollY, behavior: 'auto' });
			}
		});
	}

	function openDetails(pick: SmartPick, event?: Event) {
		focusedPickId = pick.place.id;
		sheetController?.open(pick, event?.currentTarget as HTMLElement | null);
	}

	function closeDetails() {
		sheetController?.close();
	}

	onMount(() => {
		let active = true;
		const url = new URL(window.location.href);
		const queryView = url.searchParams.get('view');
		if (queryView === 'list' || queryView === 'map') {
			view = queryView;
		} else if (initialView !== 'map') {
			try {
				const savedView = window.localStorage.getItem(VIEW_STORAGE_KEY);
				if (savedView === 'list' || savedView === 'map') view = savedView;
			} catch { /* ignore unavailable storage */ }
		}
		if (window.location.pathname === '/map') replaceResultsUrl('map', url.searchParams.get('focus') ?? undefined);

		sheetController = createPlaceSheetController({
			contentRoot,
			resolveById: (id) => picks.find((pick) => pick.place.id === id),
			getId: (pick) => pick.place.id,
			setSelected: (pick) => {
				selected = pick;
				if (pick) focusedPickId = pick.place.id;
			},
		});

		loadAppData().then((data) => {
			if (!active) return;
			matrix = data.matrix;
			context = resolveSearchContext(data.matrix, parseSearchParams(new URLSearchParams(window.location.search)));
			picks = rankSmartPicks(data.places, data.matrix, context);

			const resolvedOriginName = data.matrix.anchors[context.originId]?.name ?? 'Your Location';
			const resolvedDestName = context.destinationId ? (data.matrix.anchors[context.destinationId]?.name ?? 'Unknown') : 'No next class';
			appStorage.addRecentSearch({
				label: `${resolvedOriginName} → ${resolvedDestName}`,
				url: window.location.search,
				timestamp: Date.now(),
			});

			const requestedFocus = new URL(window.location.href).searchParams.get('focus');
			if (requestedFocus && picks.some((pick) => pick.place.id === requestedFocus)) focusedPickId = requestedFocus;
			if (view === 'map' && !focusedPickId) focusedPickId = picks[0]?.place.id;
			sheetController?.syncFromUrl({ restoreFocus: false });
		}).catch((cause) => {
			error = cause instanceof Error ? cause.message : 'Smart Picks could not load. Refresh when you are online.';
		}).finally(() => {
			loading = false;
		});

		return () => {
			active = false;
			sheetController?.destroy();
		};
	});
</script>

<section id="picks-content" class:map-active={view === 'map'} class="picks-layout" aria-busy={loading} bind:this={contentRoot}>
	<header class="context-bar" bind:this={contextBar}>
		<div class="trip-ticket">
			<a class="back-link" href="/" aria-label="Edit route">←</a>

			<div class="ticket-route">
				<p class="ticket-label">Your route</p>
				<div class="route-copy">
					<span class="route-point route-point--origin" aria-hidden="true"></span>
					<strong title={originName}>{originName}</strong>
					<span class="route-arrow" aria-hidden="true">→</span>
					<span class="route-point route-point--destination" aria-hidden="true"></span>
					<strong title={destinationName}>{destinationName}</strong>
				</div>
				{#if context?.sourceApp === 'room-tba'}<small class="route-source">From Room TBA</small>{/if}
			</div>

			<dl class="ticket-meta" aria-label="Current route preferences">
				<div>
					<dt>Time</dt>
					<dd>{context?.breakMinutes ?? 45} min</dd>
				</div>
				<div>
					<dt>Preference</dt>
					<dd>{categoryLabel}</dd>
				</div>
			</dl>

			<a class="edit-link" href="/">Edit</a>
		</div>

		<div class="context-actions">
			<div class="view-switch" role="group" aria-label="Results view">
				<button type="button" class:active={view === 'list'} aria-pressed={view === 'list'} onclick={() => switchView('list')}>List</button>
				<button type="button" class:active={view === 'map'} aria-pressed={view === 'map'} onclick={() => switchView('map')}>Map</button>
			</div>

			<div class="refinements" aria-label="Refine Smart Picks">
				<details>
					<summary>{context?.breakMinutes ?? 45} min</summary>
					<div class="refine-menu">
						<p>Break time</p>
						{#each breakOptions as minutes}
							<a class:active={context?.breakMinutes === minutes} href={hrefFor({ breakMinutes: minutes })}>{minutes} min</a>
						{/each}
					</div>
				</details>
				<details>
					<summary>{categoryLabel}</summary>
					<div class="refine-menu refine-menu--wide">
						<p>Food preference</p>
						{#each categoryOptions as option}
							<a class:active={context?.preferredCategory === option.value} href={hrefFor({ preferredCategory: option.value })}>{option.label}</a>
						{/each}
					</div>
				</details>
			</div>
			<ShareButton
				label="Share route"
				title="UPPETITE route"
				text={`${originName} → ${destinationName} · ${context?.breakMinutes ?? 45} min break`}
				path={routeSharePath}
				compact
				mobileIconOnly
			/>
		</div>
	</header>

	<div class="results-sheet">
		{#if loading}
			<div class="loading visible" role="status" aria-live="polite">
				<p class="eyebrow">Checking Your Route</p>
				<div class="skeleton-card"><span></span><span></span><span></span><span></span></div>
				<div class="skeleton-card"><span></span><span></span><span></span><span></span></div>
			</div>
		{:else if error}
			<div class="empty" role="alert">
				<p class="eyebrow">Data Unavailable</p>
				<h1>Smart Picks could not load.</h1>
				<p>{error}</p>
				<div class="recovery-actions"><button type="button" onclick={() => window.location.reload()}>Try Again</button><a href="/">Route Planner</a></div>
			</div>
		{:else if picks.length === 0}
			<div class="empty">
				<p class="eyebrow">No Feasible Stops</p>
				<h1>No places fit this route yet.</h1>
				<p>{context?.preferredCategory ? `No ${categoryLabel.toLocaleLowerCase()} options passed the current time and route checks.` : 'The current break is too tight for the available route data.'}</p>
				<div class="recovery-actions">
					{#if context?.preferredCategory}<a class="primary" href={hrefFor({ preferredCategory: undefined })}>Show All Food</a>{/if}
					{#if (context?.breakMinutes ?? 45) < 180}<a class:primary={!context?.preferredCategory} href={hrefFor({ breakMinutes: Math.min(180, (context?.breakMinutes ?? 45) + 15) })}>Add 15 Minutes</a>{/if}
					<a href="/">Change Route</a>
				</div>
			</div>
		{:else}
			<section class="list-view" hidden={view !== 'list'} aria-labelledby="results-title">
				<header class="results-header">
					<p class="eyebrow">Smart Picks</p>
					<h1 id="results-title">{picks.length} {picks.length === 1 ? 'place fits' : 'places fit'} your break.</h1>
					<p>Impossible stops are removed first. The rest are ranked by route fit, time available, preference, and data confidence.</p>
				</header>
				<div class="result-list" aria-live="polite">
					{#each visiblePicks as pick, index}
						<PlaceCard
							{pick}
							rank={index + 1}
							onDetails={(event) => openDetails(pick, event)}
							onMap={() => switchView('map', pick)}
						/>
					{/each}
				</div>
				{#if remainingPicks > 0}<div class="result-disclosure"><p>Showing {visiblePicks.length} of {picks.length} route-fit places.</p><button type="button" onclick={() => visibleCount += 12}>Show {Math.min(12, remainingPicks)} more <span aria-hidden="true">↓</span><span class="sr-only"> — {remainingPicks} remaining</span></button></div>{/if}
			</section>

			<section class="map-view" hidden={view !== 'map'} aria-labelledby="map-results-title">
				{#if view === 'map'}
				<div class="map-heading">
					<div>
						<p class="eyebrow">Route Map</p>
						<h1 id="map-results-title">{picks.length} route-fit {picks.length === 1 ? 'place' : 'places'}</h1>
					</div>
					<p>
						<span class="map-help-short">Tap a pick or food dot to compare.</span>
						<span class="map-help-long">Select a numbered Smart Pick or any food dot to compare it without leaving the map.</span>
					</p>
				</div>

				<div class="map-frame">
					{#if !origin}
						<div class="map-status" role="alert"><strong>Map unavailable</strong><span>Choose a valid origin building.</span></div>
					{:else if mapFallback}
						<div class="diagram-fallback" role="img" aria-label="Coordinate diagram of origin, food candidates, and destination">
							<span class="point">A</span><i></i><span class="food">{picks.length} food picks</span>{#if destination}<i></i><span class="point end">B</span>{/if}
							<p>The basemap is unavailable. Your ranked list still works.</p>
						</div>
					{:else}
						<MapCanvas {origin} {destination} {picks} selectedId={focusedPickId} {routeCoordinates} onSelect={setFocusedPick} onUnavailable={() => mapFallback = true} />
					{/if}

					<div class="map-data-note map-data-note--desktop" role="note">{routingNote}</div>
					<details class="map-route-info">
						<summary>{routingBadgeLabel} <span aria-hidden="true">ⓘ</span></summary>
						<p>{routingNote}</p>
					</details>
					{#if focusedPick && focusedRank > 0}
						<div class="map-preview-wrap" aria-live="polite">
							<MapPickPreview pick={focusedPick} rank={focusedRank} onDetails={(event) => openDetails(focusedPick, event)} />
						</div>
					{/if}
				</div>

				<div class="map-shortlist" aria-label="Top route-fit places">
					{#each picks.slice(0, 8) as pick, index}
						<button
							type="button"
							data-place-id={pick.place.id}
							class:selected={focusedPickId === pick.place.id}
							aria-pressed={focusedPickId === pick.place.id}
							onclick={() => setFocusedPick(pick)}
						>
							<span>{index + 1}</span>
							<strong>{pick.place.name}</strong>
							<small>{Math.round(pick.walkToPlaceSeconds / 60)} min walk · {Math.round(pick.timeRemainingSeconds / 60)} min available</small>
						</button>
					{/each}
				</div>
				{/if}
			</section>
		{/if}
	</div>
</section>

<PlaceSheet place={selected?.place} pick={selected} open={!!selected} onClose={closeDetails} />

<style>
	.picks-layout {
		width: min(100% - 2rem, 52rem);
		min-width: 0;
		min-height: calc(100dvh - 4.5rem);
		margin: 1rem auto 0;
		transition: width 180ms ease;
	}

	.picks-layout.map-active {
		width: min(100% - 2rem, 88rem);
	}

	.context-bar {
		position: sticky;
		z-index: 20;
		top: 0.75rem;
		padding: 0.7rem;
		border: 1px solid rgb(255 255 255 / 0.78);
		border-radius: 1.3rem;
		background: rgb(255 249 241 / 0.91);
		box-shadow: 0 0.85rem 2.2rem rgb(92 16 22 / 0.12);
		backdrop-filter: blur(18px) saturate(1.08);
	}

	.trip-ticket {
		display: grid;
		grid-template-columns: var(--tap-target) minmax(0, 1fr) auto auto;
		align-items: center;
		gap: 0.7rem;
	}

	.back-link,
	.edit-link {
		min-height: var(--tap-target);
		display: grid;
		place-items: center;
		color: var(--brand-maroon-deep);
		font-weight: 760;
		text-decoration: none;
	}

	.back-link {
		width: var(--tap-target);
		border: 1px solid var(--color-border);
		border-radius: 50%;
		background: rgb(255 255 255 / 0.72);
	}

	.edit-link {
		padding: 0 0.55rem;
	}

	.ticket-route {
		min-width: 0;
	}

	.ticket-label {
		margin: 0 0 0.35rem;
		color: var(--brand-muted);
		font: 760 0.62rem / 1 var(--font-display);
		letter-spacing: 0.095em;
		text-transform: uppercase;
	}

	.route-copy {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto auto minmax(0, 1fr);
		align-items: center;
		gap: 0.42rem;
		min-width: 0;
		color: var(--brand-maroon-deep);
	}

	.route-copy strong {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font: 730 0.86rem / 1.18 var(--font-display);
	}

	.route-point {
		width: 0.72rem;
		height: 0.72rem;
		border-radius: 50%;
	}

	.route-point--origin {
		border: 2px solid var(--brand-olive);
		background: var(--brand-cream);
	}

	.route-point--destination {
		border: 2px solid var(--brand-maroon-deep);
		background: var(--brand-cream);
	}

	.route-arrow {
		color: var(--brand-orange);
		font-weight: 800;
	}

	.route-source {
		display: block;
		margin-top: 0.3rem;
		color: var(--color-text-muted);
		font-size: 0.68rem;
	}

	.ticket-meta {
		display: grid;
		grid-template-columns: auto auto;
		gap: 0.35rem;
		margin: 0;
	}

	.ticket-meta div {
		min-width: 5.4rem;
		padding: 0.55rem 0.65rem;
		border: 1px solid rgb(92 16 22 / 0.08);
		border-radius: 0.75rem;
		background: rgb(242 232 220 / 0.7);
	}

	.ticket-meta dt {
		color: var(--brand-muted);
		font-size: 0.58rem;
		font-weight: 740;
		letter-spacing: 0.075em;
		text-transform: uppercase;
	}

	.ticket-meta dd {
		max-width: 8rem;
		margin: 0.22rem 0 0;
		overflow: hidden;
		color: var(--brand-maroon-deep);
		font: 760 0.76rem / 1.15 var(--font-display);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.context-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.65rem;
		flex-wrap: wrap;
		margin-top: 0.65rem;
		padding-top: 0.65rem;
		border-top: 1px solid var(--color-border);
	}

	.view-switch {
		display: grid;
		grid-template-columns: 1fr 1fr;
		min-width: 8.5rem;
		padding: 0.25rem;
		border-radius: 0.85rem;
		background: var(--brand-sand);
	}

	.view-switch button {
		min-height: var(--tap-target);
		padding: 0 0.75rem;
		border: 0;
		border-radius: 0.65rem;
		background: transparent;
		color: var(--brand-maroon-deep);
		font: 720 0.78rem / 1 var(--font-display);
	}

	.view-switch button.active {
		background: var(--brand-maroon-deep);
		color: var(--brand-cream);
		box-shadow: 0 0.2rem 0.65rem rgb(92 16 22 / 0.18);
	}

	.refinements {
		display: flex;
		min-width: 0;
		gap: 0.45rem;
		flex-wrap: wrap;
	}

	.refinements details {
		position: relative;
	}

	.refinements summary {
		display: grid;
		place-items: center;
		min-height: var(--tap-target);
		max-width: 9rem;
		padding: 0 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: 999px;
		background: rgb(255 255 255 / 0.7);
		color: var(--brand-maroon-deep);
		font-size: 0.75rem;
		font-weight: 720;
		cursor: pointer;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		list-style: none;
	}

	.refinements summary::-webkit-details-marker { display: none; }
	.refinements summary::after { content: '⌄'; margin-left: 0.3rem; }

	.refine-menu {
		position: absolute;
		z-index: 40;
		top: calc(100% + 0.45rem);
		right: 0;
		width: 10rem;
		padding: 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 1rem;
		background: var(--brand-cream);
		box-shadow: 0 1rem 2.5rem rgb(92 16 22 / 0.18);
	}

	.refine-menu--wide { width: 12rem; }
	.refine-menu p { margin: 0.3rem 0.4rem 0.45rem; color: var(--color-text-muted); font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
	.refine-menu a { display: flex; align-items: center; min-height: var(--tap-target); padding: 0 0.65rem; border-radius: 0.65rem; color: var(--brand-maroon-deep); font-size: 0.8rem; font-weight: 650; text-decoration: none; }
	.refine-menu a:hover,
	.refine-menu a.active { background: var(--brand-sand); }

	.results-sheet { min-width: 0; padding: var(--space-6) 0 6rem; }
	.results-header { margin-bottom: 1.2rem; }
	.eyebrow { margin: 0; color: var(--color-text-accent); font: 760 0.72rem / 1 var(--font-display); letter-spacing: 0.12em; text-transform: uppercase; }

	.results-header h1,
	.empty h1,
	.map-heading h1 {
		margin: 0.45rem 0 0;
		color: var(--brand-maroon-deep);
		font: 790 clamp(2rem, 7vw, 3rem) / 0.98 var(--font-display);
		letter-spacing: -0.045em;
	}

	.results-header > p:last-child,
	.empty > p,
	.map-heading > p {
		max-width: 42rem;
		margin: 0.75rem 0 0;
		color: var(--color-text-muted);
		line-height: 1.55;
	}

	.list-view, .result-list { min-width: 0; }
	.result-list { display: grid; gap: var(--space-4); }
	.loading,
	.empty { padding: 2rem 0; }
	.loading { min-height: 22rem; animation: fade-in 140ms ease; }
	@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
	.result-disclosure { display: grid; justify-items: center; gap: var(--space-2); margin-top: var(--space-5); text-align: center; }
	.result-disclosure p { margin: 0; color: var(--color-text-muted); }
	.result-disclosure button { min-height: var(--tap-target); padding: 0 var(--space-5); border: 1px solid var(--brand-maroon-deep); border-radius: var(--radius-sm); background: var(--brand-maroon-deep); color: var(--brand-cream); font-weight: 760; }
	.skeleton-card { display: grid; gap: 0.7rem; margin-top: 1rem; padding: 1.25rem; border-radius: 1.25rem; background: var(--color-surface-raised); }
	.skeleton-card span { height: 1rem; border-radius: 999px; background: linear-gradient(90deg, var(--brand-sand), white, var(--brand-sand)); background-size: 200% 100%; animation: shimmer 1.4s linear infinite; }
	.skeleton-card span:nth-child(1) { width: 30%; }
	.skeleton-card span:nth-child(2) { width: 75%; height: 2rem; }
	.skeleton-card span:nth-child(3) { width: 100%; height: 4rem; }
	.skeleton-card span:nth-child(4) { width: 55%; }

	.recovery-actions { display: flex; flex-wrap: wrap; gap: 0.65rem; margin-top: 1rem; }
	.recovery-actions a,
	.recovery-actions button { display: grid; place-items: center; min-height: var(--tap-target); padding: 0 1rem; border: 1px solid var(--brand-maroon-deep); border-radius: 0.85rem; background: transparent; color: var(--brand-maroon-deep); font-weight: 740; text-decoration: none; }
	.recovery-actions .primary,
	.recovery-actions button { background: var(--brand-maroon-deep); color: var(--brand-cream); }

	.map-view { min-width: 0; }
	.map-heading { display: flex; align-items: end; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
	.map-heading > div { min-width: 0; }
	.map-heading h1 { font-size: clamp(1.8rem, 6vw, 2.7rem); }
	.map-heading > p { width: min(24rem, 44%); margin: 0; font-size: 0.78rem; text-align: right; }

	.map-frame {
		position: relative;
		height: 66vh;
		height: min(66dvh, 42rem);
		overflow: hidden;
		border: 1px solid var(--color-border);
		border-radius: 1.5rem;
		background: var(--brand-sand);
		box-shadow: 0 1rem 2.5rem rgb(92 16 22 / 0.12);
	}

	.map-status,
	.diagram-fallback { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 0.5rem; padding: 2rem; text-align: center; background: var(--brand-sand); }
	.map-status strong { color: var(--brand-maroon-deep); font: 780 1.5rem / 1 var(--font-display); }
	.map-status span { color: var(--color-text-muted); }
	.diagram-fallback { grid-template-columns: auto 1fr auto 1fr auto; color: var(--brand-maroon-deep); }
	.diagram-fallback i { width: min(18vw, 8rem); border-top: 3px dashed var(--brand-orange); }
	.diagram-fallback .point,
	.diagram-fallback .food { display: grid; place-items: center; min-width: 2.75rem; min-height: 2.75rem; padding: 0.5rem; border-radius: 999px; font-weight: 800; }
	.diagram-fallback .point { border: 3px solid var(--brand-olive); background: var(--brand-cream); color: var(--brand-olive); }
	.diagram-fallback .food { border-color: transparent; background: var(--brand-orange); color: var(--brand-charcoal); }
	.diagram-fallback .end { border-color: var(--brand-maroon-deep); background: var(--brand-cream); color: var(--brand-maroon-deep); }
	.diagram-fallback p { grid-column: 1 / -1; max-width: 28rem; color: var(--color-text-muted); }

	.map-data-note { position: absolute; z-index: 3; top: 0.75rem; left: 0.75rem; width: min(calc(100% - 5.5rem), 27rem); padding: 0.55rem 0.7rem; border: 1px solid rgb(255 255 255 / 0.75); border-radius: 0.8rem; background: rgb(255 249 241 / 0.9); color: var(--color-text-muted); font-size: 0.66rem; line-height: 1.35; backdrop-filter: blur(12px); }
	.map-route-info { display: none; }
	.map-help-short { display: none; }
	.map-preview-wrap { position: absolute; z-index: 5; right: 0.75rem; bottom: 0.75rem; left: 0.75rem; display: flex; justify-content: flex-start; pointer-events: none; }
	.map-preview-wrap :global(.map-preview) { pointer-events: auto; }

	.map-shortlist { display: flex; gap: 0.55rem; margin-top: 0.75rem; padding: 0.15rem 0 0.35rem; overflow-x: auto; overscroll-behavior-inline: contain; scrollbar-width: thin; scroll-snap-type: x proximity; }
	.map-shortlist button { display: grid; grid-template-columns: 2.1rem minmax(8.5rem, 1fr); grid-template-rows: auto auto; flex: 0 0 min(18rem, 78vw); min-height: 4.6rem; padding: 0.65rem; border: 1px solid var(--color-border); border-radius: 1rem; background: var(--color-surface-raised); color: var(--brand-maroon-deep); text-align: left; scroll-snap-align: start; }
	.map-shortlist button.selected { border-color: var(--brand-maroon-deep); box-shadow: inset 0 0 0 1px var(--brand-maroon-deep); background: rgb(230 106 25 / 0.1); }
	.map-shortlist button > span { grid-row: 1 / 3; display: grid; place-items: center; width: 2rem; height: 2rem; border: 2px solid var(--brand-maroon-deep); border-radius: 50%; background: var(--brand-cream); color: var(--brand-maroon-deep); font-weight: 800; }
	.map-shortlist button.selected > span { border-color: var(--brand-cream); background: var(--brand-orange); color: var(--brand-charcoal); box-shadow: 0 0 0 3px rgb(255 249 241 / 0.78); }
	.map-shortlist strong { min-width: 0; overflow: hidden; font: 730 0.86rem / 1.1 var(--font-display); text-overflow: ellipsis; white-space: nowrap; }
	.map-shortlist small { min-width: 0; margin-top: 0.25rem; overflow: hidden; color: var(--color-text-muted); font-size: 0.68rem; text-overflow: ellipsis; white-space: nowrap; }

	@keyframes shimmer { to { background-position: -200% 0; } }

	@media (max-width: 760px) {
		.trip-ticket {
			grid-template-columns: var(--tap-target) minmax(0, 1fr) auto;
		}

		.ticket-meta {
			grid-column: 2 / 4;
			grid-row: 2;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.ticket-meta div {
			min-width: 0;
		}
	}

	@media (max-width: 620px) {
		.picks-layout,
		.picks-layout.map-active { width: min(100% - 1rem, 52rem); margin-top: 0.5rem; }
		.context-bar { top: 0.4rem; border-radius: 1rem; }
		.context-actions { align-items: stretch; }
		.view-switch { min-width: 7.5rem; }
		.refinements { flex: 1; justify-content: flex-end; }
		.refinements summary { max-width: 7.3rem; padding-inline: 0.6rem; }
		.map-heading { display: block; }
		.map-heading > p { width: auto; margin-top: 0.55rem; text-align: left; }
		.map-frame { height: 65vh; height: max(29rem, calc(100dvh - 15rem)); border-radius: 1.15rem; }
		.map-data-note { top: 0.55rem; left: 0.55rem; width: calc(100% - 5rem); font-size: 0.62rem; }
		.map-preview-wrap { right: 0.55rem; bottom: 0.55rem; left: 0.55rem; }
	}

	@media (max-width: 430px) {
		.trip-ticket {
			gap: 0.5rem;
		}

		.route-copy {
			grid-template-columns: auto minmax(0, 1fr);
			gap: 0.3rem 0.4rem;
		}

		.route-copy .route-arrow {
			display: none;
		}

		.route-point--destination {
			grid-column: 1;
		}

		.ticket-meta {
			grid-column: 1 / -1;
		}

		.edit-link {
			padding-inline: 0.35rem;
		}
	}

	/* Mobile Route Map: keep the compact treatment isolated from List and desktop. */
	@media (max-width: 759px) {
		.picks-layout.map-active {
			--mobile-nav-clearance: calc(5.45rem + env(safe-area-inset-bottom));
			width: min(100% - 0.75rem, 52rem);
			margin-top: 0.35rem;
		}

		.picks-layout.map-active .context-bar {
			top: 0.25rem;
			padding: 0.45rem;
			border-radius: 1rem;
		}

		.picks-layout.map-active .trip-ticket {
			grid-template-columns: var(--tap-target) minmax(0, 1fr) auto;
			align-items: center;
			gap: 0.45rem;
		}

		.picks-layout.map-active .ticket-label,
		.picks-layout.map-active .ticket-meta,
		.picks-layout.map-active .route-source { display: none; }

		.picks-layout.map-active .route-copy {
			grid-template-columns: auto minmax(0, 1fr) auto auto minmax(0, 1fr);
			gap: 0.28rem;
		}

		.picks-layout.map-active .route-copy strong {
			font-size: 0.78rem;
			line-height: 1.1;
		}

		.picks-layout.map-active .route-copy .route-arrow { display: block; font-size: 0.78rem; }
		.picks-layout.map-active .route-point { width: 0.6rem; height: 0.6rem; }
		.picks-layout.map-active .route-point--destination { grid-column: auto; }
		.picks-layout.map-active .edit-link { min-height: var(--tap-target); padding-inline: 0.35rem; font-size: 0.78rem; }

		.picks-layout.map-active .context-actions {
			display: grid;
			grid-template-columns: 6.25rem minmax(0, 1fr) var(--tap-target);
			align-items: center;
			gap: 0.35rem;
			margin-top: 0.4rem;
			padding-top: 0.4rem;
		}

		.picks-layout.map-active .view-switch {
			width: 6.25rem;
			min-width: 0;
			padding: 0.18rem;
			border-radius: 0.75rem;
		}

		.picks-layout.map-active .view-switch button {
			min-height: var(--tap-target);
			padding-inline: 0.25rem;
			border-radius: 0.6rem;
			font-size: 0.75rem;
		}

		.picks-layout.map-active .refinements {
			display: grid;
			grid-template-columns: minmax(3.6rem, 0.85fr) minmax(4.8rem, 1.15fr);
			justify-content: end;
			gap: 0.35rem;
			max-width: 14rem;
			min-width: 0;
			flex: initial;
		}

		.picks-layout.map-active .refinements details { min-width: 0; }
		.picks-layout.map-active .refinements summary {
			display: flex;
			width: 100%;
			min-height: var(--tap-target);
			max-width: none;
			align-items: center;
			justify-content: center;
			gap: 0.2rem;
			padding-inline: 0.4rem;
			font-size: 0.75rem;
		}
		.picks-layout.map-active .refinements summary::after { margin-left: 0; }

		.picks-layout.map-active .results-sheet { padding-top: 0.55rem; }
		.picks-layout.map-active .map-heading { display: block; margin-bottom: 0.45rem; }
		.picks-layout.map-active .map-heading .eyebrow { display: none; }
		.picks-layout.map-active .map-heading h1 {
			margin: 0;
			font-size: clamp(1.2rem, 5vw, 1.45rem);
			line-height: 1.05;
			letter-spacing: -0.03em;
		}
		.picks-layout.map-active .map-heading > p {
			width: auto;
			margin-top: 0.25rem;
			font-size: 0.72rem;
			line-height: 1.3;
			text-align: left;
		}
		.picks-layout.map-active .map-help-short { display: inline; }
		.picks-layout.map-active .map-help-long { display: none; }

		/* The frame ends above the fixed BottomNav instead of extending underneath it. */
		.picks-layout.map-active .map-frame {
			height: clamp(16rem, calc(100dvh - 18.5rem - env(safe-area-inset-bottom)), 42rem);
			border-radius: 1.15rem;
		}

		.picks-layout.map-active .map-data-note--desktop { display: none; }
		.picks-layout.map-active .map-route-info {
			position: absolute;
			z-index: 4;
			top: 0.5rem;
			left: 0.5rem;
			display: block;
			width: min(17rem, calc(100% - 4.75rem));
			color: var(--color-text-muted);
		}
		.picks-layout.map-active .map-route-info summary {
			display: inline-flex;
			min-height: 2.75rem;
			align-items: center;
			gap: 0.35rem;
			padding: 0 0.65rem;
			border: 1px solid rgb(255 255 255 / 0.8);
			border-radius: 999px;
			background: rgb(255 249 241 / 0.93);
			box-shadow: 0 0.45rem 1.2rem rgb(92 16 22 / 0.12);
			color: var(--brand-maroon-deep);
			font: 720 0.7rem/1 var(--font-display);
			cursor: pointer;
			list-style: none;
			backdrop-filter: blur(12px);
		}
		.picks-layout.map-active .map-route-info summary::-webkit-details-marker { display: none; }
		.picks-layout.map-active .map-route-info p {
			margin: 0.35rem 0 0;
			padding: 0.65rem 0.7rem;
			border: 1px solid rgb(255 255 255 / 0.8);
			border-radius: 0.85rem;
			background: rgb(255 249 241 / 0.96);
			box-shadow: 0 0.7rem 1.6rem rgb(92 16 22 / 0.14);
			font-size: 0.7rem;
			line-height: 1.4;
			backdrop-filter: blur(14px);
		}

		.picks-layout.map-active .map-preview-wrap { right: 0.5rem; bottom: 0.5rem; left: 0.5rem; }
		.picks-layout.map-active .map-shortlist { margin-top: 0.5rem; }
	}

	@media (max-width: 350px) {
		.picks-layout.map-active .context-bar { padding-inline: 0.35rem; }
		.picks-layout.map-active .trip-ticket,
		.picks-layout.map-active .context-actions { gap: 0.28rem; }
		.picks-layout.map-active .route-point { display: none; }
		.picks-layout.map-active .route-copy { grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); }
		.picks-layout.map-active .route-copy strong,
		.picks-layout.map-active .view-switch button,
		.picks-layout.map-active .refinements summary { font-size: 0.72rem; }
	}

	@media (min-width: 1000px) {
		.results-sheet { padding-top: 1.8rem; }
		.map-frame { height: 70vh; height: min(70dvh, 46rem); }
		.map-preview-wrap { right: auto; width: 32rem; }
	}

	@media (prefers-reduced-motion: reduce) {
		.picks-layout { transition: none; }
		.skeleton-card span { animation: none; }
	}
</style>
