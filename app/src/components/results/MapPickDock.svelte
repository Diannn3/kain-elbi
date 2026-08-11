<script lang="ts">
	import { availabilityLabel } from '../../lib/place-availability';
	import type { SmartPick } from '../../lib/types';

	let {
		pick,
		rank,
		onDetails,
	}: {
		pick: SmartPick;
		rank: number;
		onDetails: (event: MouseEvent) => void;
	} = $props();

	const walkMinutes = $derived(Math.max(0, Math.round(pick.walkToPlaceSeconds / 60)));
	const availableMinutes = $derived(Math.max(0, Math.round(pick.timeRemainingSeconds / 60)));
	const statusLabel = $derived(
		pick.availability === 'unknown'
			? (pick.place.openingHours ? 'Hours need checking' : 'Hours unavailable')
			: availabilityLabel(pick.availability).split(' · ')[0],
	);
</script>

<button
	type="button"
	class="map-pick-dock"
	aria-label={`Details for ${pick.place.name}, route fit #${rank}`}
	onclick={onDetails}
>
	<span class="fit-rank">#{rank}</span>
	<span class="pick-copy">
		<strong>{pick.place.name}</strong>
		<small>{walkMinutes} min walk · {availableMinutes} min available · {statusLabel}</small>
	</span>
	<span class="summary-arrow" aria-hidden="true">→</span>
</button>

<style>
	.map-pick-dock {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.55rem;
		width: min(100%, 34rem);
		min-height: 3.5rem;
		padding: 0.35rem 0.4rem 0.35rem 0.55rem;
		border: 1px solid rgb(255 255 255 / 0.82);
		border-radius: 0.95rem;
		background: rgb(255 249 241 / 0.96);
		box-shadow: 0 0.8rem 2rem rgb(92 16 22 / 0.2);
		color: var(--brand-maroon-deep);
		text-align: left;
		backdrop-filter: blur(18px);
	}

	.fit-rank {
		padding: 0.34rem 0.48rem;
		border-radius: 999px;
		background: rgb(230 106 25 / 0.16);
		font: 780 0.62rem/1 var(--font-display);
		white-space: nowrap;
	}

	.pick-copy {
		display: grid;
		min-width: 0;
		gap: 0.2rem;
	}

	.pick-copy strong,
	.pick-copy small {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.pick-copy strong { font: 760 0.88rem/1.05 var(--font-display); }
	.pick-copy small { color: var(--color-text-muted); font-size: 0.64rem; line-height: 1.1; }

	.summary-arrow {
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		background: var(--brand-maroon-deep);
		color: var(--brand-cream);
		font-size: 1rem;
	}

	@media (min-width: 760px) {
		.map-pick-dock { display: none; }
	}
</style>
