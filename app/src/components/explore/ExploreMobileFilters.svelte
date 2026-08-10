<script lang="ts">
	type HoursFilter = '' | 'open' | 'closing';
	type BudgetFilter = '' | 100 | 150 | 200;
	type Option = { id: string; name?: string; title?: string; placeCount?: number };

	let {
		zones,
		collections,
		zoneId,
		collectionId,
		hours,
		budget,
		hoursCapableCount,
		pricedPlaceCount,
		hoursLoading,
		hoursError,
		onZone,
		onCollection,
		onHours,
		onBudget,
	}: {
		zones: Option[];
		collections: Option[];
		zoneId: string;
		collectionId: string;
		hours: HoursFilter;
		budget: BudgetFilter;
		hoursCapableCount: number;
		pricedPlaceCount: number;
		hoursLoading: boolean;
		hoursError: string;
		onZone: (value: string) => void;
		onCollection: (value: string) => void;
		onHours: (value: HoursFilter) => void;
		onBudget: (value: string) => void;
	} = $props();

	let dialog = $state<HTMLDialogElement>();
	const activeCount = $derived(
		Number(Boolean(zoneId))
		+ Number(Boolean(collectionId))
		+ Number(Boolean(hours))
		+ Number(Boolean(budget)),
	);

	function open() {
		if (!dialog?.open) dialog.showModal();
	}

	function closeOnBackdrop(event: MouseEvent) {
		if (event.target === dialog) dialog.close();
	}
</script>

<div class="mobile-filter-trigger">
	<button type="button" onclick={open} aria-haspopup="dialog">
		<svg aria-hidden="true" viewBox="0 0 24 24">
			<path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6" />
		</svg>
		<span>Filters{activeCount ? ` · ${activeCount}` : ''}</span>
	</button>
</div>

<dialog bind:this={dialog} class="mobile-filter-dialog" aria-labelledby="mobile-filter-title" onclick={closeOnBackdrop}>
	<div class="sheet">
		<header>
			<div>
				<p>Explore</p>
				<h2 id="mobile-filter-title">Filters</h2>
			</div>
			<form method="dialog"><button class="done" type="submit">Done</button></form>
		</header>

		{#if hoursCapableCount > 0}
			<fieldset>
				<legend>Hours</legend>
				<div class="button-row">
					<button type="button" class:active={!hours} aria-pressed={!hours} onclick={() => onHours('')}>Any</button>
					<button type="button" class:active={hours === 'open'} aria-pressed={hours === 'open'} onclick={() => onHours('open')}>Open now</button>
					<button type="button" class:active={hours === 'closing'} aria-pressed={hours === 'closing'} onclick={() => onHours('closing')}>Closing soon</button>
				</div>
				{#if hoursLoading}<small>Checking source-listed hours…</small>{/if}
				{#if hoursError}<small class="filter-error">{hoursError}</small>{/if}
			</fieldset>
		{/if}

		<label>
			<span>Area</span>
			<select value={zoneId} onchange={(event) => onZone(event.currentTarget.value)}>
				<option value="">All areas</option>
				{#each zones as zone}
					<option value={zone.id}>{zone.name}{zone.placeCount !== undefined ? ` · ${zone.placeCount}` : ''}</option>
				{/each}
			</select>
		</label>

		<label>
			<span>Browse list</span>
			<select value={collectionId} onchange={(event) => onCollection(event.currentTarget.value)}>
				<option value="">All places</option>
				{#each collections as collection}
					<option value={collection.id}>{collection.title}</option>
				{/each}
			</select>
		</label>

		{#if pricedPlaceCount > 0}
			<label>
				<span>Budget</span>
				<select value={budget === '' ? '' : String(budget)} onchange={(event) => onBudget(event.currentTarget.value)}>
					<option value="">Any budget</option>
					<option value="100">Online-listed meal ≤ ₱100</option>
					<option value="150">Online-listed meal ≤ ₱150</option>
					<option value="200">Online-listed meal ≤ ₱200</option>
				</select>
			</label>
		{/if}
	</div>
</dialog>

<style>
	.mobile-filter-trigger,
	.mobile-filter-dialog {
		display: none;
	}

	@media (max-width: 759px) {
		.mobile-filter-trigger {
			display: flex;
			justify-content: flex-end;
		}
		.mobile-filter-trigger > button {
			min-height: var(--tap-target);
			display: inline-flex;
			align-items: center;
			gap: var(--space-2);
			padding: 0 var(--space-4);
			border: 1px solid var(--color-border-strong);
			border-radius: 999px;
			background: var(--brand-cream);
			color: var(--brand-maroon-deep);
			font-weight: 760;
		}
		.mobile-filter-trigger svg {
			width: 1.05rem;
			height: 1.05rem;
			fill: none;
			stroke: currentColor;
			stroke-width: 1.8;
			stroke-linecap: round;
			stroke-linejoin: round;
		}
		.mobile-filter-dialog[open] {
			display: block;
			width: 100%;
			max-width: none;
			max-height: min(78dvh, 46rem);
			margin: auto 0 0;
			padding: 0;
			border: 0;
			border-radius: 1.5rem 1.5rem 0 0;
			background: transparent;
			color: var(--color-text);
			overflow: visible;
		}
		.mobile-filter-dialog::backdrop {
			background: rgb(35 4 8 / 0.34);
			backdrop-filter: blur(2px);
		}
		.sheet {
			max-height: min(78dvh, 46rem);
			display: grid;
			gap: var(--space-5);
			padding: var(--space-5) var(--space-4) calc(var(--space-6) + env(safe-area-inset-bottom));
			border: 1px solid var(--color-border);
			border-bottom: 0;
			border-radius: inherit;
			background: var(--brand-cream);
			overflow-y: auto;
			overscroll-behavior: contain;
		}
		header {
			display: flex;
			align-items: end;
			justify-content: space-between;
			gap: var(--space-4);
		}
		header p,
		header h2 {
			margin: 0;
		}
		header p {
			margin-bottom: var(--space-1);
			color: var(--brand-orange);
			font: 760 0.68rem/1 var(--font-display);
			letter-spacing: 0.08em;
			text-transform: uppercase;
		}
		header h2 {
			color: var(--brand-maroon-deep);
			font: 780 1.55rem/1 var(--font-display);
		}
		.done {
			min-height: var(--tap-target);
			padding: 0 var(--space-4);
			border: 0;
			border-radius: 999px;
			background: var(--brand-maroon-deep);
			color: var(--brand-cream);
			font-weight: 760;
		}
		fieldset,
		label {
			min-width: 0;
			display: grid;
			gap: var(--space-2);
		}
		fieldset {
			margin: 0;
			padding: 0;
			border: 0;
		}
		legend,
		label > span {
			margin-bottom: var(--space-2);
			color: var(--color-text-muted);
			font-size: 0.74rem;
			font-weight: 720;
		}
		.button-row {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: var(--space-2);
		}
		.button-row button {
			min-height: var(--tap-target);
			padding: 0 var(--space-2);
			border: 1px solid var(--color-border);
			border-radius: 0.9rem;
			background: var(--brand-white);
			color: var(--brand-maroon-deep);
			font-size: 0.78rem;
			font-weight: 700;
		}
		.button-row button.active {
			border-color: var(--brand-maroon-deep);
			background: var(--brand-maroon-deep);
			color: var(--brand-cream);
		}
		select {
			width: 100%;
			min-height: var(--tap-target);
			padding: 0 var(--space-3);
			border: 1px solid var(--color-border-strong);
			border-radius: 0.9rem;
			background: var(--brand-white);
			color: var(--brand-charcoal);
		}
		small {
			color: var(--color-text-muted);
			font-size: 0.72rem;
		}
		.filter-error {
			color: var(--brand-maroon-deep);
		}
	}
</style>
