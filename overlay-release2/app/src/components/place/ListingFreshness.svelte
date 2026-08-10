<script lang="ts">
	import type { Place } from '../../lib/types';

	let {
		place,
		showBusinessAction = false,
		compact = false,
	}: {
		place: Place;
		showBusinessAction?: boolean;
		compact?: boolean;
	} = $props();

	const editUrl = $derived(`/contribute?place=${encodeURIComponent(place.id)}#suggest-edit`);
	const businessUrl = $derived(`/contribute?place=${encodeURIComponent(place.id)}#business-update`);

	function displayDate(value: string | null | undefined) {
		if (!value) return '';
		const date = new Date(`${value}T00:00:00Z`);
		if (!Number.isFinite(date.getTime())) return value;
		return new Intl.DateTimeFormat('en-PH', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'Asia/Manila',
		}).format(date);
	}
</script>

<section class:compact class="freshness" aria-label={`Listing freshness for ${place.name}`}>
	<div>
		<strong>Still accurate?</strong>
		{#if place.lastReviewedAt}
			<span>Info checked {displayDate(place.lastReviewedAt)}.</span>
		{:else}
			<span>This listing has not been community-reviewed yet.</span>
		{/if}
	</div>
	<div class="freshness-actions">
		<a href={editUrl}>Something changed? Suggest an edit →</a>
		{#if showBusinessAction}
			<a href={businessUrl}>Run this place? Update business info →</a>
		{/if}
	</div>
</section>

<style>
	.freshness {
		display: grid;
		gap: var(--space-3);
		margin-top: var(--space-4);
		padding: var(--space-4) 0;
		border-block: 1px solid var(--color-border);
	}
	.freshness > div:first-child { display: grid; gap: var(--space-1); }
	.freshness strong {
		color: var(--brand-maroon-deep);
		font: 760 0.88rem/1.25 var(--font-display);
	}
	.freshness span {
		color: var(--color-text-muted);
		font-size: 0.78rem;
		line-height: 1.4;
	}
	.freshness-actions { display: flex; gap: var(--space-3); flex-wrap: wrap; }
	.freshness a {
		min-height: var(--tap-target);
		display: inline-flex;
		align-items: center;
		color: var(--brand-maroon-deep);
		font-size: 0.8rem;
		font-weight: 720;
		text-underline-offset: 0.2em;
	}
	.freshness.compact { margin-top: var(--space-3); padding-block: var(--space-3); }
	.freshness.compact .freshness-actions { display: block; }
	.freshness.compact a { min-height: 2.75rem; }
</style>
