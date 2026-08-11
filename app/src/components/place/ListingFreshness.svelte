<script lang="ts">
	import { onMount } from 'svelte';
	import type { Place } from '../../lib/types';
	import { formatAddedDate } from '../../lib/date-format';
	import {
		communityBackendConfig,
		hasReportedActionToday,
		reportCommunityAction,
	} from '../../lib/community/backend';

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
	const backendConfigured = communityBackendConfig().configured;

	let accuracyState = $state<'idle' | 'sending' | 'done' | 'error'>('idle');
	let accuracyMessage = $state('');

	onMount(() => {
		if (backendConfigured && hasReportedActionToday(place.id, 'accuracy_confirmed')) accuracyState = 'done';
	});

	const displayDate = formatAddedDate;

	async function confirmAccuracy() {
		if (!backendConfigured || accuracyState === 'sending' || accuracyState === 'done') return;
		accuracyState = 'sending';
		accuracyMessage = '';

		try {
			await reportCommunityAction(place.id, 'accuracy_confirmed');
			accuracyState = 'done';
			accuracyMessage = 'Thanks — confirmation counted for today.';
		} catch {
			accuracyState = 'error';
			accuracyMessage = 'Could not record that confirmation right now.';
		}
	}
</script>

<section class:compact class="freshness" aria-label={`Listing freshness for ${place.name}`}>
	<div class="freshness-copy">
		<strong>Still accurate?</strong>
		{#if place.lastReviewedAt}
			<span>Info checked {displayDate(place.lastReviewedAt)}.</span>
		{:else}
			<span>This listing has not been community-reviewed yet.</span>
		{/if}
	</div>

	<div class="freshness-actions">
		{#if backendConfigured}
			<button
				type="button"
				onclick={confirmAccuracy}
				disabled={accuracyState === 'sending' || accuracyState === 'done'}
			>
				{accuracyState === 'sending'
					? 'Counting…'
					: accuracyState === 'done'
						? '✓ Looks right today'
						: 'Yes, looks right'}
			</button>
		{/if}
		<a href={editUrl}>Something changed? Suggest an edit →</a>
		{#if showBusinessAction}
			<a href={businessUrl}>Run this place? Update business info →</a>
		{/if}
	</div>

	{#if accuracyMessage}
		<small class:error={accuracyState === 'error'} aria-live="polite">{accuracyMessage}</small>
	{/if}
</section>

<style>
	.freshness {
		display: grid;
		gap: var(--space-3);
		margin-top: var(--space-4);
		padding: var(--space-4) 0;
		border-block: 1px solid var(--color-border);
	}
	.freshness-copy {
		display: grid;
		gap: var(--space-1);
	}
	.freshness strong {
		color: var(--brand-maroon-deep);
		font: 760 0.88rem/1.25 var(--font-display);
	}
	.freshness span,
	.freshness small {
		color: var(--color-text-muted);
		font-size: 0.78rem;
		line-height: 1.4;
	}
	.freshness small.error { color: var(--brand-maroon-deep); }
	.freshness-actions {
		display: flex;
		gap: var(--space-2) var(--space-3);
		flex-wrap: wrap;
		align-items: center;
	}
	.freshness button,
	.freshness a {
		min-height: var(--tap-target);
		display: inline-flex;
		align-items: center;
		font-size: 0.8rem;
		font-weight: 720;
	}
	.freshness button {
		padding: 0 var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: 999px;
		background: var(--brand-sand);
		color: var(--brand-maroon-deep);
		cursor: pointer;
	}
	.freshness button:hover:not(:disabled) { border-color: var(--brand-maroon-deep); }
	.freshness button:disabled { cursor: default; opacity: 0.75; }
	.freshness a {
		color: var(--brand-maroon-deep);
		text-underline-offset: 0.2em;
	}
	.freshness.compact {
		margin-top: var(--space-3);
		padding-block: var(--space-3);
	}
	.freshness.compact .freshness-actions {
		align-items: flex-start;
		flex-direction: column;
	}
	.freshness.compact button,
	.freshness.compact a {
		min-height: 2.75rem;
	}
</style>
