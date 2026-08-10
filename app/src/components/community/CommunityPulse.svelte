<script lang="ts">
	import { onMount } from 'svelte';
	import { communityBackendConfig, loadCommunityPulse, type CommunityPulseRow } from '../../lib/community/backend';
	import { categoryLabel } from '../../lib/place-presentation';
	import type { FoodZone, Place } from '../../lib/types';

	let {
		places,
		zones,
	}: {
		places: Place[];
		zones: FoodZone[];
	} = $props();

	const configured = communityBackendConfig().configured;
	const placeById = new Map(places.map((place) => [place.id, place]));

	let rows = $state<CommunityPulseRow[]>([]);
	let ready = $state(false);
	let selectedZoneId = $state('');

	const knownRows = $derived(rows.filter((row) => placeById.has(row.placeId)));
	const topRows = $derived(knownRows.slice(0, 5));
	const zoneOptions = $derived(
		zones
			.filter((zone) => zone.id !== 'elsewhere-lb')
			.map((zone) => ({
				zone,
				rows: knownRows
					.filter((row) => row.zoneId === zone.id)
					.sort((a, b) => b.visitReports30d - a.visitReports30d),
			}))
			.filter((item) => item.rows.length > 0)
			.sort((a, b) => {
				const bTotal = b.rows.reduce((sum, row) => sum + row.visitReports30d, 0);
				const aTotal = a.rows.reduce((sum, row) => sum + row.visitReports30d, 0);
				return bTotal - aTotal;
			}),
	);

	const selectedZone = $derived(zoneOptions.find((item) => item.zone.id === selectedZoneId) ?? zoneOptions[0]);
	const selectedZoneRows = $derived(selectedZone?.rows.slice(0, 5) ?? []);

	$effect(() => {
		if (!selectedZoneId && zoneOptions.length) selectedZoneId = zoneOptions[0].zone.id;
		if (selectedZoneId && !zoneOptions.some((item) => item.zone.id === selectedZoneId)) {
			selectedZoneId = zoneOptions[0]?.zone.id ?? '';
		}
	});

	onMount(async () => {
		if (!configured) {
			ready = true;
			return;
		}
		try {
			const response = await loadCommunityPulse();
			rows = response.rows;
		} catch {
			rows = [];
		} finally {
			ready = true;
		}
	});
</script>

{#if configured && ready && topRows.length}
	<section class="community-pulse" aria-labelledby="community-pulse-title">
		<div class="pulse-heading">
			<div>
				<p class="eyebrow-global">Community Pulse</p>
				<h2 id="community-pulse-title">Where Elbi students report going.</h2>
			</div>
			<p>Explicit anonymous visit reports · last 30 days · updated daily.</p>
		</div>

		<div class="pulse-grid">
			<section class="ranked" aria-labelledby="most-visited-title">
				<div class="section-title">
					<span>Most visited</span>
					<strong id="most-visited-title">Across UPPETITE</strong>
				</div>
				<ol>
					{#each topRows as row}
						{@const place = placeById.get(row.placeId)!}
						<li>
							<a href={`/place/${place.id}`}>
								<span class="rank">{String(topRows.indexOf(row) + 1).padStart(2, '0')}</span>
								<span class="place-copy">
									<strong>{place.name}</strong>
									<small>{categoryLabel(place.category)} · {row.visitReports30d} reported visits</small>
								</span>
								<span class="arrow" aria-hidden="true">→</span>
							</a>
						</li>
					{/each}
				</ol>
			</section>

			{#if zoneOptions.length}
				<section class="ranked zone-ranked" aria-labelledby="zone-popular-title">
					<div class="section-title">
						<span>Popular by area</span>
						<strong id="zone-popular-title">{selectedZone?.zone.name}</strong>
					</div>

					<div class="zone-chips" role="group" aria-label="Choose an area">
						{#each zoneOptions.slice(0, 6) as item}
							<button
								type="button"
								class:active={item.zone.id === selectedZone?.zone.id}
								aria-pressed={item.zone.id === selectedZone?.zone.id}
								onclick={() => selectedZoneId = item.zone.id}
							>
								{item.zone.shortName}
							</button>
						{/each}
					</div>

					<ol>
						{#each selectedZoneRows as row}
							{@const place = placeById.get(row.placeId)!}
							<li>
								<a href={`/place/${place.id}`}>
									<span class="rank">{String(selectedZoneRows.indexOf(row) + 1).padStart(2, '0')}</span>
									<span class="place-copy">
										<strong>{place.name}</strong>
										<small>{row.visitReports30d} reported visits</small>
									</span>
									<span class="arrow" aria-hidden="true">→</span>
								</a>
							</li>
						{/each}
					</ol>
				</section>
			{/if}
		</div>

		<p class="pulse-note">
			Popularity is display-only. It never changes Smart Picks scoring.
		</p>
	</section>
{/if}

<style>
	.community-pulse {
		display: grid;
		gap: var(--space-5);
		padding-block: var(--space-2);
	}
	.pulse-heading {
		display: grid;
		gap: var(--space-3);
	}
	.pulse-heading h2 {
		max-width: 19ch;
		margin: var(--space-2) 0 0;
		color: var(--brand-maroon-deep);
		font: 780 clamp(1.8rem, 6vw, 2.9rem)/0.96 var(--font-display);
	}
	.pulse-heading > p {
		max-width: 40rem;
		margin: 0;
		color: var(--color-text-muted);
		font-size: 0.78rem;
		line-height: 1.45;
	}
	.pulse-grid {
		display: grid;
		gap: var(--space-6);
	}
	.ranked {
		min-width: 0;
	}
	.section-title {
		display: grid;
		gap: var(--space-1);
		padding-bottom: var(--space-3);
		border-bottom: 1px solid var(--color-border);
	}
	.section-title span {
		color: var(--brand-orange);
		font: 760 0.68rem/1 var(--font-display);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.section-title strong {
		color: var(--brand-maroon-deep);
		font: 760 1.15rem/1.1 var(--font-display);
	}
	.ranked ol {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.ranked li {
		border-bottom: 1px solid var(--color-border);
	}
	.ranked li a {
		display: grid;
		grid-template-columns: 2.2rem minmax(0, 1fr) auto;
		align-items: center;
		gap: var(--space-3);
		min-height: 4.75rem;
		color: inherit;
		text-decoration: none;
	}
	.ranked li a:hover .place-copy > strong,
	.ranked li a:focus-visible .place-copy > strong {
		text-decoration: underline;
		text-underline-offset: 0.18em;
	}
	.rank {
		color: var(--brand-orange);
		font: 760 0.72rem/1 var(--font-display);
	}
	.place-copy {
		min-width: 0;
		display: grid;
		gap: var(--space-1);
	}
	.place-copy > strong {
		overflow: hidden;
		color: var(--brand-maroon-deep);
		font: 730 0.95rem/1.2 var(--font-display);
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.place-copy small {
		color: var(--color-text-muted);
		font-size: 0.72rem;
	}
	.arrow {
		color: var(--brand-orange);
		font-weight: 800;
	}
	.zone-chips {
		display: flex;
		gap: var(--space-2);
		overflow-x: auto;
		padding: var(--space-3) 0 var(--space-1);
		scrollbar-width: thin;
	}
	.zone-chips button {
		min-height: 2.5rem;
		padding: 0 var(--space-3);
		flex: none;
		border: 1px solid var(--color-border);
		border-radius: 999px;
		background: var(--brand-cream);
		color: var(--brand-maroon-deep);
		font-weight: 700;
		white-space: nowrap;
	}
	.zone-chips button.active {
		border-color: var(--brand-maroon-deep);
		background: var(--brand-maroon-deep);
		color: var(--brand-cream);
	}
	.pulse-note {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 0.74rem;
	}
	@media (min-width: 860px) {
		.pulse-heading {
			grid-template-columns: minmax(0, 1fr) minmax(16rem, 0.6fr);
			align-items: end;
		}
		.pulse-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: var(--space-8);
		}
	}
</style>
