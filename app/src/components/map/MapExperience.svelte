<script lang="ts">
	import { onMount } from 'svelte';
	import { loadAppData } from '../../lib/data/loaders';
	import { createPlaceSheetController, type PlaceSheetController } from '../../lib/place-sheet-controller';
	import { parseSearchParams } from '../../lib/search-state';
	import { rankSmartPicks } from '../../lib/smart-picks';
	import { resolveSearchContext } from '../../lib/routing';
	import type { Anchor, SearchContext, SmartPick } from '../../lib/types';
	import PlaceSheet from '../place/PlaceSheet.svelte';
	import MapCanvas from './MapCanvas.svelte';

	let loading = $state(true);
	let error = $state('');
	let fallback = $state(false);
	let context = $state<SearchContext>();
	let origin = $state<Anchor>();
	let destination = $state<Anchor>();
	let picks = $state<SmartPick[]>([]);
	let focusedPickId = $state<string>();
	let sheetPick = $state<SmartPick>();
	let contentRoot: HTMLElement;
	let mapStage: HTMLElement;
	let sheetController: PlaceSheetController<SmartPick> | undefined;

	function focusPick(pick: SmartPick) {
		focusedPickId = pick.place.id;
		if (!window.matchMedia('(max-width: 899px)').matches) return;
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		requestAnimationFrame(() => mapStage?.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' }));
	}

	function openDetails(pick: SmartPick, trigger: HTMLElement) {
		focusedPickId = pick.place.id;
		sheetController?.open(pick, trigger);
	}

	function closeSheet() {
		sheetController?.close();
	}

	onMount(() => {
		let active = true;
		sheetController = createPlaceSheetController({
			contentRoot,
			resolveById: (id) => picks.find((pick) => pick.place.id === id),
			getId: (pick) => pick.place.id,
			setSelected: (pick) => {
				sheetPick = pick;
				if (pick) focusedPickId = pick.place.id;
			},
		});
		loadAppData()
			.then((data) => {
				if (!active) return;
				context = resolveSearchContext(data.matrix, parseSearchParams(new URLSearchParams(window.location.search)));
				origin = data.matrix.anchors[context.originId];
				destination = context.destinationId ? data.matrix.anchors[context.destinationId] : undefined;
				picks = rankSmartPicks(data.places, data.matrix, context);
				sheetController?.syncFromUrl({ restoreFocus: false });
			})
			.catch((cause) => { error = cause instanceof Error ? cause.message : 'The map data could not load.'; })
			.finally(() => { loading = false; });
		return () => {
			active = false;
			sheetController?.destroy();
		};
	});
</script>

<main id="main-content" class="map-page">
	<section id="map-shell" class="map-shell" aria-busy={loading} bind:this={contentRoot}>
		<header class="map-bar">
			<a href={`/picks${typeof window === 'undefined' ? '' : window.location.search}`} aria-label="Back to Smart Picks">←</a>
			<div><strong>Route Map</strong><span>{picks.length} {picks.length === 1 ? 'pick' : 'picks'}</span></div>
			<a href={`/picks${typeof window === 'undefined' ? '' : window.location.search}`}>List</a>
		</header>

		<div class="map-stage" bind:this={mapStage}>
			{#if loading}
				<div class="map-status" role="status">Loading route context…</div>
			{:else if error || !origin}
				<div class="map-status" role="alert"><strong>Map unavailable</strong><span>{error || 'Choose a valid origin building.'}</span></div>
			{:else if fallback}
				<div class="diagram-fallback" role="img" aria-label="Coordinate diagram of origin, food candidates, and destination">
					<span class="point">A</span><i></i><span class="food">{picks.length || '0'} food picks</span>{#if destination}<i></i><span class="point end">B</span>{/if}
					<p>WebGL is unavailable. This is route context, not walking directions.</p>
				</div>
			{:else}
				<MapCanvas {origin} {destination} {picks} selectedId={focusedPickId} onSelect={focusPick} onUnavailable={() => fallback = true} />
			{/if}
		</div>

		<section class="map-list" aria-labelledby="map-list-title">
			<div class="map-list-heading">
				<div><p>Accessible Map List</p><h1 id="map-list-title">Food That Fits This Route</h1></div>
				<span>Dashed lines show feasibility context</span>
			</div>
			<div class="connectivity-note" role="note">The map needs an internet connection. Route results and saved app data remain available offline.</div>
			{#if !loading && !error && picks.length === 0}
				<div class="empty"><strong>No feasible candidates</strong><span>Change your route or increase the break time.</span></div>
			{/if}
			<div class="compact-list">
				{#each picks as pick, index}
					<div class:selected={focusedPickId === pick.place.id} class="compact-item">
						<button
							type="button"
							class="place-focus"
							data-place-id={pick.place.id}
							aria-pressed={focusedPickId === pick.place.id}
							aria-label={`Focus ${pick.place.name} on the map`}
							onclick={() => focusPick(pick)}
						>
							<span class="number">{index + 1}</span>
							<span><strong>{pick.place.name}</strong><small>{pick.explanation}</small></span>
							<b>{Math.round(pick.timeRemainingSeconds / 60)} min</b>
						</button>
						<button type="button" class="place-details" onclick={(event) => openDetails(pick, event.currentTarget)}>Details</button>
					</div>
				{/each}
			</div>
		</section>
	</section>
</main>

<PlaceSheet place={sheetPick?.place} pick={sheetPick} open={!!sheetPick} onClose={closeSheet} />

<style>
	.map-page { min-height: calc(100dvh - 4rem); padding-bottom: 5rem; background: var(--cream); }
	.map-shell { display: grid; grid-template-rows: auto minmax(22rem, 52dvh) auto; min-height: calc(100dvh - 4rem); }
	.map-bar { z-index: 4; display: grid; grid-template-columns: 3rem 1fr 3rem; align-items: center; min-height: 4rem; padding: 0.5rem 1rem; color: white; background: var(--forest); }
	.map-bar a { display: grid; place-items: center; min-height: 2.75rem; border: 1px solid hsl(0 0% 100% / .25); border-radius: 999px; text-decoration: none; }
	.map-bar div { text-align: center; }
	.map-bar strong, .map-bar span { display: block; }
	.map-bar strong { font: 760 1rem/1 var(--font-display); }
	.map-bar span { margin-top: .25rem; color: hsl(0 0% 100% / .65); font-size: .7rem; }
	.map-stage { position: relative; min-height: 22rem; overflow: hidden; }
	.map-status, .diagram-fallback { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: .5rem; padding: 2rem; text-align: center; background: var(--mist); }
	.map-status strong { color: var(--forest); font: 780 1.5rem/1 var(--font-display); }
	.map-status span { color: var(--muted); }
	.diagram-fallback { grid-template-columns: auto 1fr auto 1fr auto; color: var(--forest); }
	.diagram-fallback i { width: min(18vw, 8rem); border-top: 3px dashed var(--leaf); }
	.diagram-fallback .point, .diagram-fallback .food { display: grid; place-items: center; min-width: 2.75rem; min-height: 2.75rem; padding: .5rem; border-radius: 999px; color: white; background: var(--forest); font-weight: 800; }
	.diagram-fallback .food { color: var(--forest); background: var(--sun); }
	.diagram-fallback .end { background: var(--leaf); }
	.diagram-fallback p { grid-column: 1 / -1; max-width: 28rem; color: var(--muted); }
	.map-list { position: relative; z-index: 3; margin-top: -1.5rem; padding: 1.5rem 1rem 2rem; border-radius: 1.75rem 1.75rem 0 0; background: var(--cream); }
	.map-list-heading { display: flex; align-items: end; justify-content: space-between; gap: 1rem; }
	.map-list-heading p { margin: 0 0 .4rem; color: var(--text-accent); font: 750 .68rem/1 var(--font-display); letter-spacing: .12em; text-transform: uppercase; }
	.map-list-heading h1 { margin: 0; color: var(--forest); font: 780 clamp(1.75rem, 7vw, 2.75rem)/.95 var(--font-display); }
	.map-list-heading > span { display: none; color: var(--muted); font-size: .75rem; }
	.connectivity-note { margin-top: .9rem; padding: .7rem .8rem; border-radius: .75rem; color: var(--muted); background: var(--mist); font-size: .72rem; }
	.compact-list { display: grid; }
	.compact-item { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; min-width: 0; border-top: 1px solid var(--line); transition: background-color 180ms ease, box-shadow 180ms ease; }
	.compact-item:hover, .compact-item.selected { color: var(--forest); background: hsl(44 96% 49% / .1); }
	.compact-item.selected { box-shadow: inset 3px 0 var(--sun); }
	.place-focus { display: grid; grid-template-columns: 2.5rem minmax(0, 1fr) auto; align-items: center; gap: .75rem; min-width: 0; min-height: 5rem; padding: .75rem; border: 0; color: inherit; background: transparent; text-align: left; }
	.place-focus > span:nth-child(2) { min-width: 0; overflow-wrap: anywhere; }
	.place-details { min-width: 4.75rem; min-height: 2.75rem; margin-right: .5rem; padding: .55rem .75rem; border: 1px solid var(--line); border-radius: 999px; color: var(--forest); background: var(--cream); font: 730 .75rem/1 var(--font-display); }
	.place-details:hover { border-color: var(--leaf); background: var(--mist); }
	.compact-list .number { display: grid; place-items: center; width: 2.35rem; height: 2.35rem; border-radius: 50%; background: var(--sun); font-weight: 800; }
	.compact-list strong, .compact-list small { display: block; }
	.compact-list strong { font: 730 1rem/1.1 var(--font-display); }
	.compact-list small { margin-top: .3rem; color: var(--muted); line-height: 1.3; }
	.compact-list b { color: var(--text-accent); font-size: .8rem; white-space: nowrap; }
	.empty { display: grid; gap: .35rem; padding: 2rem 0; color: var(--muted); }
	.empty strong { color: var(--forest); font: 750 1.3rem/1 var(--font-display); }
	@media (min-width: 900px) {
		.map-page { padding: 1.5rem 2rem 2.5rem; }
		.map-shell { grid-template-columns: minmax(0, 7fr) minmax(24rem, 5fr); grid-template-rows: auto minmax(0, 1fr); width: min(100%, 88rem); height: calc(100dvh - 7rem); min-height: 42rem; margin: auto; overflow: hidden; border-radius: 1.75rem; box-shadow: 0 24px 60px hsl(154 76% 8% / .16); }
		.map-bar { grid-column: 1 / -1; }
		.map-stage { min-height: 0; }
		.map-list { min-height: 0; margin: 0; overflow-y: auto; border-radius: 0; }
		.map-list-heading > span { display: block; max-width: 12rem; text-align: right; }
	}
	@media (max-width: 430px) {
		.place-focus { grid-template-columns: 2.5rem minmax(0, 1fr); }
		.place-focus b { grid-column: 2; }
		.place-details { min-width: 4.25rem; padding-inline: .6rem; }
	}
</style>
