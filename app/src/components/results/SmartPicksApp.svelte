<script lang="ts">
	import { onMount } from 'svelte';
	import { loadAppData } from '../../lib/data/loaders';
	import { parseSearchParams } from '../../lib/search-state';
	import { rankSmartPicks } from '../../lib/smart-picks';
	import type { RouteMatrixV1, SearchContext, SmartPick } from '../../lib/types';
	import PlaceCard from '../cards/PlaceCard.svelte';
	import PlaceSheet from '../place/PlaceSheet.svelte';

	let loading = $state(true);
	let error = $state('');
	let picks = $state<SmartPick[]>([]);
	let context = $state<SearchContext>();
	let matrix = $state<RouteMatrixV1>();
	let selected = $state<SmartPick>();
	let trigger: HTMLElement | null = null;

	const originName = $derived(context && matrix ? matrix.anchors[context.originId]?.name ?? 'Selected origin' : 'Selected origin');
	const destinationName = $derived(context?.destinationId && matrix ? matrix.anchors[context.destinationId]?.name : 'One-way nearby');

	function mapHref(pick?: SmartPick) {
		const params = new URLSearchParams(window.location.search);
		if (pick) params.set('place', pick.place.id);
		return `/map?${params.toString()}`;
	}

	function openDetails(pick: SmartPick, event?: Event) {
		trigger = event?.currentTarget as HTMLElement | null;
		selected = pick;
		const url = new URL(window.location.href);
		url.searchParams.set('place', pick.place.id);
		window.history.pushState({}, '', url);
		document.querySelector<HTMLElement>('#picks-content')?.setAttribute('inert', '');
	}

	function closeDetails() {
		selected = undefined;
		const url = new URL(window.location.href);
		url.searchParams.delete('place');
		window.history.pushState({}, '', url);
		document.querySelector<HTMLElement>('#picks-content')?.removeAttribute('inert');
		queueMicrotask(() => trigger?.focus());
	}

	onMount(() => {
		let active = true;
		const handlePop = () => {
			const id = new URLSearchParams(window.location.search).get('place');
			selected = picks.find((pick) => pick.place.id === id);
		};
		loadAppData().then((data) => {
			if (!active) return;
			matrix = data.matrix;
			context = parseSearchParams(new URLSearchParams(window.location.search));
			picks = rankSmartPicks(data.places, data.matrix, context);
			const selectedId = new URLSearchParams(window.location.search).get('place');
			selected = picks.find((pick) => pick.place.id === selectedId);
			window.addEventListener('popstate', handlePop);
		}).catch((cause) => {
			error = cause instanceof Error ? cause.message : 'Smart Picks could not load. Refresh when you are online.';
		}).finally(() => {
			loading = false;
		});
		return () => {
			active = false;
			window.removeEventListener('popstate', handlePop);
		};
	});
</script>

<section id="picks-content" class="picks-layout" aria-busy={loading}>
	<div class="route-preview" aria-label="Route context diagram">
		<div class="route-summary">
			<a href="/" aria-label="Change route">←</a>
			<div><span>{originName}</span><small>{destinationName}</small></div>
			<a href={loading ? '/map' : mapHref()}>Map</a>
		</div>
		<div class="diagram" aria-hidden="true">
			<span class="point">A</span><i></i><span class="food">Food</span><i></i><span class="point point--end">B</span>
		</div>
		<p>Feasibility context only · not turn-by-turn directions</p>
	</div>

	<div class="results-sheet">
		{#if loading}
			<div class="loading" role="status" aria-live="polite">
				<span></span><span></span><span></span>
				<p>Checking route feasibility…</p>
			</div>
		{:else if error}
			<div class="empty" role="alert"><p class="eyebrow">Data Unavailable</p><h1>Smart Picks could not load.</h1><p>{error}</p><a href="/">Return to Route Planner</a></div>
		{:else if picks.length === 0}
			<div class="empty"><p class="eyebrow">No Feasible Stops</p><h1>Your route is too tight right now.</h1><p>Increase your break, remove the craving filter, or choose a closer next class building.</p><a href="/">Change Your Route</a></div>
		{:else}
			<header class="results-header">
				<p class="eyebrow">Smart Picks</p>
				<h1>{picks.length} {picks.length === 1 ? 'Place Fits' : 'Places Fit'} Your {context?.breakMinutes}-Minute Break</h1>
				<p>Every result passed the time and route checks before it was ranked.</p>
			</header>
			<div class="result-list" aria-live="polite">
				{#each picks as pick, index}
					<PlaceCard {pick} rank={index + 1} onDetails={(event) => openDetails(pick, event)} mapHref={mapHref(pick)} />
				{/each}
			</div>
		{/if}
	</div>
</section>

{#if selected}
	<PlaceSheet place={selected.place} pick={selected} open={true} onClose={closeDetails} />
{/if}

<style>
	.picks-layout { min-height: calc(100dvh - 4.5rem); }
	.route-preview { position: relative; min-height: 38dvh; padding: 1rem max(1rem, calc((100vw - 74rem) / 2)); background: var(--forest); color: white; overflow: hidden; }
	.route-preview::after { content: ''; position: absolute; inset: 0; opacity: 0.15; background-image: radial-gradient(circle, var(--sun) 1px, transparent 1px); background-size: 18px 18px; }
	.route-summary { position: relative; z-index: 2; display: grid; grid-template-columns: 2.75rem 1fr 2.75rem; align-items: center; gap: 0.7rem; }
	.route-summary > a { display: grid; place-items: center; min-height: 2.75rem; border: 1px solid hsl(0 0% 100% / 0.25); border-radius: 50%; text-decoration: none; }
	.route-summary > a:last-child { border-radius: 999px; font-size: 0.75rem; }
	.route-summary div { min-width: 0; text-align: center; }
	.route-summary span, .route-summary small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.route-summary span { font: 720 0.95rem/1.2 var(--font-display); }
	.route-summary small { margin-top: 0.2rem; color: hsl(0 0% 100% / 0.62); }
	.diagram { position: relative; z-index: 2; display: flex; align-items: center; width: min(100%, 36rem); margin: clamp(3rem, 8vh, 5rem) auto 0; }
	.diagram i { flex: 1; height: 2px; border-top: 2px dashed hsl(0 0% 100% / 0.5); }
	.point, .food { display: grid; place-items: center; flex: 0 0 auto; border-radius: 50%; color: var(--forest); background: white; font: 780 0.75rem/1 var(--font-display); }
	.point { width: 2.5rem; height: 2.5rem; }
	.point--end { background: var(--leaf); color: white; }
	.food { width: 4.25rem; height: 4.25rem; background: var(--sun); transform: rotate(-7deg); }
	.route-preview > p { position: relative; z-index: 2; margin: 1.25rem auto 0; color: hsl(0 0% 100% / 0.58); font-size: 0.7rem; text-align: center; }
	.results-sheet { position: relative; z-index: 3; width: min(100%, 52rem); min-height: 62dvh; margin: -1.5rem auto 0; padding: 1.5rem 1rem 4rem; border-radius: 1.75rem 1.75rem 0 0; background: var(--cream); }
	.results-header .eyebrow, .empty .eyebrow { margin: 0; color: var(--leaf); font: 750 0.72rem/1 var(--font-display); letter-spacing: 0.12em; text-transform: uppercase; }
	.results-header h1, .empty h1 { max-width: 18ch; margin: 0.55rem 0 0; color: var(--forest); font: 790 clamp(2rem, 8vw, 3.8rem)/0.94 var(--font-display); }
	.results-header > p:last-child, .empty > p { color: var(--muted); line-height: 1.5; }
	.loading { min-height: 20rem; display: grid; place-content: center; justify-items: center; color: var(--muted); }
	.loading > span { width: min(80vw, 30rem); height: 1rem; margin: 0.4rem; border-radius: 1rem; background: hsl(145 20% 88%); animation: pulse 1.4s ease-in-out infinite alternate; }
	.loading > span:nth-child(2) { width: min(65vw, 24rem); }
	.loading > span:nth-child(3) { width: min(72vw, 27rem); }
	.empty { min-height: 25rem; display: grid; align-content: center; justify-items: start; }
	.empty a { display: grid; place-items: center; min-height: 3.25rem; margin-top: 0.75rem; padding: 0 1rem; border-radius: 0.9rem; background: var(--forest); color: white; font-weight: 720; text-decoration: none; }
	@keyframes pulse { to { opacity: 0.42; } }
	@media (min-width: 900px) {
		.picks-layout { display: grid; grid-template-columns: minmax(24rem, 5fr) minmax(32rem, 7fr); width: min(100% - 4rem, 74rem); margin: 2rem auto 0; gap: 2rem; }
		.route-preview { position: sticky; top: 1rem; min-height: calc(100dvh - 3rem); border-radius: 2rem; padding: 1.25rem; }
		.results-sheet { width: 100%; margin: 0; padding: 1.25rem 0 4rem; border-radius: 0; background: transparent; }
	}
	@media (prefers-reduced-motion: reduce) { .loading > span { animation: none; } }
</style>
