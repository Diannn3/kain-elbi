<script lang="ts">
	import { availabilityLabel } from '../../lib/place-availability';
	import type { SmartPick } from '../../lib/types';
	import { appStorage } from '../../lib/storage.svelte';

	let {
		pick,
		rank,
		onDetails,
		onMap,
	}: {
		pick: SmartPick;
		rank: number;
		onDetails: (event: MouseEvent) => void;
		onMap: (event: MouseEvent) => void;
	} = $props();

	const categoryNames: Record<string, string> = {
		cafe: 'Café',
		restaurant: 'Restaurant',
		fast_food: 'Quick Bite',
		food_court: 'Food Court',
		bakery_deli: 'Bakery & Sweets',
		kiosk_stall: 'Kiosk & Stall',
		other: 'Food Place',
	};

	const walkMinutes = $derived(Math.max(0, Math.round(pick.walkToPlaceSeconds / 60)));
	const availableMinutes = $derived(Math.max(0, Math.round(pick.timeRemainingSeconds / 60)));
	const detourMinutes = $derived(
		pick.detourSeconds === undefined
			? undefined
			: Math.max(0, Math.round(pick.detourSeconds / 60)),
	);
	const routeFitLabel = $derived(rank === 1 ? 'Best fit' : `Route fit #${rank}`);
	const statusLabel = $derived(
		pick.availability === 'unknown'
			? (pick.place.openingHours ? 'Hours need checking' : 'Hours unavailable')
			: availabilityLabel(pick.availability).split(' · ')[0],
	);
</script>

<article class="place-card" data-place-id={pick.place.id}>
	<div class="card-topline">
		<div class="topline-badges">
			<span class:best={rank === 1} class="fit-label">{routeFitLabel}</span>
			<span class="category">{categoryNames[pick.place.category]}</span>
		</div>

		<button
			class="save-icon"
			class:saved={appStorage.isPlaceSaved(pick.place.id)}
			type="button"
			aria-label={appStorage.isPlaceSaved(pick.place.id) ? 'Remove from saved places' : 'Save place'}
			onclick={(e) => {
				e.stopPropagation();
				appStorage.toggleSavedPlace(pick.place.id);
			}}
		>
			<svg aria-hidden="true" viewBox="0 0 24 24">
				<path
					d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3 1.2-6.9-5-4.9 6.9-1Z"
					fill={appStorage.isPlaceSaved(pick.place.id) ? 'currentColor' : 'none'}
					stroke="currentColor"
					stroke-width="2"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
	</div>

	<h2>{pick.place.name}</h2>

	<dl class="metrics" aria-label={`Route metrics for ${pick.place.name}`}>
		<div>
			<dt>Walk</dt>
			<dd>{walkMinutes}<small>min</small></dd>
		</div>
		<div>
			<dt>Detour</dt>
			<dd class:word-value={detourMinutes === undefined}>
				{detourMinutes === undefined ? 'One-way' : `+${detourMinutes}`}
				{#if detourMinutes !== undefined}<small>min</small>{/if}
			</dd>
		</div>
		<div>
			<dt>Eat time</dt>
			<dd>{availableMinutes}<small>min</small></dd>
		</div>
	</dl>

	<p class="availability" data-status={pick.availability}>
		<span aria-hidden="true"></span>{statusLabel}
	</p>

	<div class="explanation-block">
		<strong>Why this fits</strong>
		<p>{pick.explanation}</p>
	</div>

	<div class="actions">
		<button type="button" class="details" onclick={onDetails}>Details</button>
		<button type="button" class="map-action" onclick={onMap}>
			Show on map <span aria-hidden="true">→</span>
		</button>
	</div>
</article>

<style>
	.place-card {
		padding: 1.25rem;
		border: 1px solid var(--color-border);
		border-radius: 1.4rem;
		background: rgb(255 255 255 / 0.78);
		box-shadow:
			0 0.7rem 2rem rgb(92 16 22 / 0.07),
			inset 0 1px 0 rgb(255 255 255 / 0.78);
		backdrop-filter: blur(12px);
		content-visibility: auto;
		contain-intrinsic-size: 20rem;
	}

	.card-topline {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.topline-badges {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.55rem;
	}

	.fit-label,
	.category {
		font: 760 0.68rem / 1 var(--font-display);
		letter-spacing: 0.075em;
		text-transform: uppercase;
	}

	.fit-label {
		padding: 0.45rem 0.68rem;
		border: 1px solid var(--color-border);
		border-radius: 999px;
		background: var(--brand-sand);
		color: var(--brand-maroon-deep);
	}

	.fit-label.best {
		border-color: transparent;
		background: var(--brand-orange);
		color: var(--brand-charcoal);
	}

	.category {
		color: var(--color-text-accent);
	}

	.save-icon {
		display: grid;
		place-items: center;
		width: var(--tap-target);
		height: var(--tap-target);
		margin: -0.55rem -0.55rem 0 0;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: var(--color-text-muted);
		transition: color 150ms ease, background-color 150ms ease, transform 150ms ease;
	}

	.save-icon:hover {
		background: var(--color-surface-muted);
		color: var(--brand-maroon-deep);
	}

	.save-icon:active {
		transform: scale(0.94);
	}

	.save-icon.saved {
		color: var(--brand-orange);
	}

	.save-icon svg {
		width: 1.3rem;
	}

	h2 {
		max-width: 22ch;
		margin: 0.9rem 0 0;
		color: var(--brand-maroon-deep);
		font: 780 clamp(1.55rem, 6vw, 2rem) / 0.99 var(--font-display);
		letter-spacing: -0.035em;
	}

	.metrics {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.45rem;
		margin: 1.05rem 0 0;
	}

	.metrics div {
		min-width: 0;
		padding: 0.8rem 0.55rem 0.78rem;
		border: 1px solid rgb(92 16 22 / 0.08);
		border-radius: 0.9rem;
		background: var(--brand-sand);
		text-align: center;
	}

	.metrics dt {
		color: var(--brand-muted);
		font-size: 0.64rem;
		font-weight: 760;
		letter-spacing: 0.085em;
		text-transform: uppercase;
	}

	.metrics dd {
		margin: 0.32rem 0 0;
		color: var(--brand-maroon-deep);
		font: 790 clamp(1.08rem, 5vw, 1.42rem) / 1 var(--font-display);
		font-variant-numeric: tabular-nums;
	}

	.metrics dd.word-value {
		font-size: clamp(0.84rem, 3vw, 1rem);
		line-height: 1.15;
	}

	.metrics dd small {
		margin-left: 0.16rem;
		color: var(--brand-muted);
		font: 650 0.66rem / 1 var(--font-body);
		text-transform: uppercase;
	}

	.availability {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0.9rem 0 0;
		color: var(--color-text-muted);
		font-size: 0.78rem;
		font-weight: 650;
	}

	.availability > span {
		width: 0.55rem;
		height: 0.55rem;
		flex: none;
		border-radius: 50%;
		background: #a36710;
	}

	.availability[data-status='open_at_arrival'] > span {
		background: #2f713f;
	}

	.availability[data-status='closes_during_stop'] > span {
		background: #b65b0d;
	}

	.availability[data-status='closed_at_arrival'] > span {
		background: #a62f2f;
	}

	.explanation-block {
		margin-top: 1rem;
		padding: 1rem;
		border: 1px solid rgb(92 16 22 / 0.08);
		border-radius: 1rem;
		background: rgb(242 232 220 / 0.58);
	}

	.explanation-block strong {
		color: var(--brand-maroon-deep);
		font: 760 0.72rem / 1 var(--font-display);
		letter-spacing: 0.075em;
		text-transform: uppercase;
	}

	.explanation-block p {
		margin: 0.5rem 0 0;
		color: var(--color-text);
		font-weight: 560;
		line-height: 1.5;
	}

	.actions {
		display: grid;
		grid-template-columns: 0.82fr 1.18fr;
		gap: 0.65rem;
		margin-top: 1rem;
	}

	.actions button {
		display: grid;
		place-items: center;
		min-height: var(--tap-target);
		padding: 0 0.9rem;
		border-radius: 0.9rem;
		font-weight: 760;
		transition: transform 150ms ease, background-color 150ms ease, border-color 150ms ease;
	}

	.actions button:hover {
		transform: translateY(-1px);
	}

	.details {
		border: 1px solid var(--brand-maroon-deep);
		background: transparent;
		color: var(--brand-maroon-deep);
	}

	.details:hover {
		background: rgb(92 16 22 / 0.055);
	}

	.map-action {
		border: 1px solid var(--brand-maroon-deep);
		background: var(--brand-maroon-deep);
		color: var(--brand-cream);
	}

	.map-action:hover {
		border-color: var(--brand-maroon-ink);
		background: var(--brand-maroon-ink);
	}

	@media (min-width: 760px) {
		.place-card {
			padding: 1.5rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.save-icon,
		.actions button {
			transition: none;
		}
	}
</style>
