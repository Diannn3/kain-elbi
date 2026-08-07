<script lang="ts">
	import { onMount } from 'svelte';
	import { loadAppData } from '../../lib/data/loaders';
	import { createPlaceSheetController, type PlaceSheetController } from '../../lib/place-sheet-controller';
	import { parseSearchParams, serializeSearchParams } from '../../lib/search-state';
	import { rankSmartPicks } from '../../lib/smart-picks';
	import { resolveSearchContext } from '../../lib/routing';
	import type { Category, RouteMatrix, SearchContext, SmartPick } from '../../lib/types';
	import PlaceCard from '../cards/PlaceCard.svelte';
	import PlaceSheet from '../place/PlaceSheet.svelte';

	let loading = $state(true);
	let error = $state('');
	let picks = $state<SmartPick[]>([]);
	let context = $state<SearchContext>();
	let matrix = $state<RouteMatrix>();
	let selected = $state<SmartPick>();
	let contentRoot: HTMLElement;
	let sheetController: PlaceSheetController<SmartPick> | undefined;

	const categoryOptions: { value?: Category; label: string }[] = [
		{ label: 'Any food' },
		{ value: 'restaurant', label: 'Rice & meals' },
		{ value: 'cafe', label: 'Café' },
		{ value: 'fast_food', label: 'Quick bites' },
		{ value: 'bakery_deli', label: 'Bakery' },
	];
	const breakOptions = [20, 30, 45, 60, 90];

	const originName = $derived(context && matrix ? matrix.anchors[context.originId]?.name ?? 'Selected origin' : 'Loading route…');
	const destinationName = $derived(context?.destinationId && matrix ? matrix.anchors[context.destinationId]?.name : 'No next class');
	const categoryLabel = $derived(categoryOptions.find((option) => option.value === context?.preferredCategory)?.label ?? 'Any food');

	function hrefFor(overrides: Partial<SearchContext> = {}) {
		if (!context) return '/picks';
		const next = { ...context, ...overrides };
		return `/picks?${serializeSearchParams(next).toString()}`;
	}

	function mapHref(pick?: SmartPick) {
		if (!context) return '/map';
		const params = serializeSearchParams(context);
		if (pick) params.set('place', pick.place.id);
		return `/map?${params.toString()}`;
	}

	function openDetails(pick: SmartPick, event?: Event) {
		sheetController?.open(pick, event?.currentTarget as HTMLElement | null);
	}

	function closeDetails() {
		sheetController?.close();
	}

	onMount(() => {
		let active = true;
		sheetController = createPlaceSheetController({
			contentRoot,
			resolveById: (id) => picks.find((pick) => pick.place.id === id),
			getId: (pick) => pick.place.id,
			setSelected: (pick) => { selected = pick; },
		});
		loadAppData().then((data) => {
			if (!active) return;
			matrix = data.matrix;
			context = resolveSearchContext(data.matrix, parseSearchParams(new URLSearchParams(window.location.search)));
			picks = rankSmartPicks(data.places, data.matrix, context);
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

<section id="picks-content" class="picks-layout" aria-busy={loading} bind:this={contentRoot}>
	<header class="context-bar">
		<div class="route-lineup">
			<a class="back-link" href="/" aria-label="Edit route">←</a>
			<div class="route-copy">
				<p><strong>{originName}</strong><span aria-hidden="true">→</span><strong>{destinationName}</strong></p>
				<small>{context?.breakMinutes ?? 45} min break · {categoryLabel}{context?.sourceApp === 'room-tba' ? ' · From Room TBA' : ''}</small>
			</div>
			<a class="edit-link" href="/">Edit</a>
		</div>

		<div class="context-actions">
			<nav class="view-switch" aria-label="Results view">
				<span aria-current="page">List</span>
				<a href={mapHref()}>Map</a>
			</nav>

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
		</div>
	</header>

	<div class="results-sheet">
		{#if loading}
			<div class="loading" role="status" aria-live="polite">
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
			<header class="results-header">
				<p class="eyebrow">Smart Picks</p>
				<h1>{picks.length} {picks.length === 1 ? 'place fits' : 'places fit'} your {context?.breakMinutes}-minute break.</h1>
				<p>Impossible stops are removed first. The rest are ranked by route fit, time available, preference, and data confidence.</p>
			</header>
			<div class="result-list" aria-live="polite">
				{#each picks as pick, index}
					<PlaceCard {pick} rank={index + 1} onDetails={(event) => openDetails(pick, event)} mapHref={mapHref(pick)} />
				{/each}
			</div>
		{/if}
	</div>
</section>

<PlaceSheet place={selected?.place} pick={selected} open={!!selected} onClose={closeDetails} />

<style>
	.picks-layout { width: min(100% - 2rem, 52rem); min-height: calc(100dvh - 4.5rem); margin: 1rem auto 0; }
	.context-bar {
		position: sticky;
		z-index: 20;
		top: 0.75rem;
		padding: 0.75rem;
		border: 1px solid hsl(0 0% 100% / 0.8);
		border-radius: 1.25rem;
		background: hsl(45 50% 98% / 0.92);
		box-shadow: 0 0.8rem 2rem hsl(154 40% 10% / 0.12);
		backdrop-filter: blur(18px);
	}
	.route-lineup { display: grid; grid-template-columns: var(--tap-target) minmax(0, 1fr) auto; align-items: center; gap: 0.65rem; }
	.back-link,
	.edit-link { min-height: var(--tap-target); display: grid; place-items: center; color: var(--forest); font-weight: 740; text-decoration: none; }
	.back-link { width: var(--tap-target); border: 1px solid var(--border-subtle); border-radius: 50%; background: var(--surface-raised); }
	.edit-link { padding: 0 0.6rem; }
	.route-copy { min-width: 0; }
	.route-copy p { display: flex; align-items: center; gap: 0.4rem; min-width: 0; margin: 0; color: var(--forest); }
	.route-copy strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 720 0.9rem/1.2 var(--font-display); }
	.route-copy span { flex: none; color: var(--text-secondary); }
	.route-copy small { display: block; margin-top: 0.25rem; overflow: hidden; color: var(--text-secondary); font-size: 0.72rem; text-overflow: ellipsis; white-space: nowrap; }
	.context-actions { display: flex; align-items: center; justify-content: space-between; gap: 0.65rem; margin-top: 0.65rem; padding-top: 0.65rem; border-top: 1px solid var(--border-subtle); }
	.view-switch { display: grid; grid-template-columns: 1fr 1fr; min-width: 8.5rem; padding: 0.25rem; border-radius: 0.85rem; background: var(--mist); }
	.view-switch span,
	.view-switch a { display: grid; place-items: center; min-height: var(--tap-target); padding: 0 0.75rem; border-radius: 0.65rem; font: 720 0.78rem/1 var(--font-display); text-decoration: none; }
	.view-switch span[aria-current='page'] { background: var(--forest); color: white; }
	.view-switch a { color: var(--forest); }
	.refinements { display: flex; min-width: 0; gap: 0.45rem; }
	.refinements details { position: relative; }
	.refinements summary { display: grid; place-items: center; min-height: var(--tap-target); max-width: 9rem; padding: 0 0.75rem; border: 1px solid var(--border-subtle); border-radius: 999px; background: var(--surface-raised); color: var(--forest); font-size: 0.75rem; font-weight: 720; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.refinements summary { list-style: none; }
	.refinements summary::-webkit-details-marker { display: none; }
	.refinements summary::after { content: '⌄'; margin-left: 0.3rem; }
	.refine-menu { position: absolute; z-index: 40; top: calc(100% + 0.45rem); right: 0; width: 10rem; padding: 0.5rem; border: 1px solid var(--border-subtle); border-radius: 1rem; background: var(--surface-raised); box-shadow: 0 1rem 2.5rem hsl(154 40% 8% / 0.18); }
	.refine-menu--wide { width: 12rem; }
	.refine-menu p { margin: 0.3rem 0.4rem 0.45rem; color: var(--text-secondary); font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
	.refine-menu a { display: flex; align-items: center; min-height: var(--tap-target); padding: 0 0.65rem; border-radius: 0.7rem; color: var(--forest); font-weight: 680; text-decoration: none; }
	.refine-menu a:hover,
	.refine-menu a.active { background: var(--mist); }
	.refine-menu a.active::after { content: '✓'; margin-left: auto; }
	.results-sheet { padding: 1.5rem 0 4rem; }
	.results-header { padding: 0.5rem 0 1.25rem; }
	.results-header .eyebrow,
	.empty .eyebrow,
	.loading .eyebrow { margin: 0; color: var(--text-accent); font: 760 0.72rem/1 var(--font-display); letter-spacing: 0.12em; text-transform: uppercase; }
	.results-header h1,
	.empty h1 { max-width: 22ch; margin: 0.55rem 0 0; color: var(--forest); font: 790 clamp(1.9rem, 7vw, 3rem)/0.96 var(--font-display); }
	.results-header > p:last-child,
	.empty > p { max-width: 43rem; color: var(--text-secondary); line-height: 1.5; }
	.result-list { display: grid; gap: 0.85rem; }
	.loading { display: grid; gap: 0.85rem; padding-top: 1rem; }
	.skeleton-card { min-height: 15rem; padding: 1.25rem; border: 1px solid var(--border-subtle); border-radius: 1.35rem; background: var(--surface-raised); }
	.skeleton-card span { display: block; width: 100%; height: 1rem; margin: 0.75rem 0; border-radius: 1rem; background: hsl(145 20% 88%); animation: pulse 1.4s ease-in-out infinite alternate; }
	.skeleton-card span:first-child { width: 35%; }
	.skeleton-card span:nth-child(2) { width: 72%; height: 1.8rem; }
	.skeleton-card span:nth-child(4) { width: 60%; }
	.empty { min-height: 26rem; display: grid; align-content: center; justify-items: start; }
	.recovery-actions { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 0.85rem; }
	.recovery-actions a,
	.recovery-actions button { display: grid; place-items: center; min-height: var(--tap-target); padding: 0 1rem; border: 1px solid var(--border-subtle); border-radius: 0.9rem; background: var(--surface-raised); color: var(--forest); font-weight: 720; text-decoration: none; }
	.recovery-actions .primary,
	.recovery-actions button { border-color: var(--forest); background: var(--forest); color: white; }
	@keyframes pulse { to { opacity: 0.42; } }
	@media (min-width: 760px) {
		.picks-layout { margin-top: 1.5rem; }
		.context-bar { padding: 0.9rem 1rem; }
		.route-copy strong { font-size: 1rem; }
		.results-sheet { padding-top: 2rem; }
	}
	@media (max-width: 440px) {
		.context-actions { align-items: stretch; }
		.view-switch { min-width: 7.5rem; }
		.refinements { flex: 1; justify-content: flex-end; }
		.refinements summary { max-width: 7rem; padding-inline: 0.6rem; }
		.route-copy strong { font-size: 0.82rem; }
	}
	@media (prefers-reduced-motion: reduce) { .skeleton-card span { animation: none; } }
</style>
