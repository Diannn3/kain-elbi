<script lang="ts">
	import { onMount } from 'svelte';
	import {
		communityBackendConfig,
		hasReportedActionToday,
		reportCommunityAction,
	} from '../../lib/community/backend';

	let {
		placeId,
		placeName,
		compact = false,
	}: {
		placeId: string;
		placeName: string;
		compact?: boolean;
	} = $props();

	const configured = communityBackendConfig().configured;
	let state = $state<'idle' | 'sending' | 'done' | 'error'>('idle');
	let message = $state('');

	onMount(() => {
		if (configured && hasReportedActionToday(placeId, 'visit_reported')) state = 'done';
	});

	async function reportVisit() {
		if (!configured || state === 'sending' || state === 'done') return;
		state = 'sending';
		message = '';

		try {
			await reportCommunityAction(placeId, 'visit_reported');
			window.dispatchEvent(new CustomEvent('uppetite:visit-reported', { detail: { placeId } }));
			state = 'done';
			message = 'Visit counted for today.';
		} catch {
			state = 'error';
			message = 'Could not record this visit right now.';
		}
	}
</script>

{#if configured}
	<div class:compact class="visit-report">
		<button
			type="button"
			onclick={reportVisit}
			disabled={state === 'sending' || state === 'done'}
			aria-label={state === 'done' ? `Visit to ${placeName} counted today` : `I went to ${placeName}`}
		>
			{#if state === 'sending'}
				Counting…
			{:else if state === 'done'}
				✓ I went here today
			{:else}
				I went here
			{/if}
		</button>
		<span>No GPS or route history is sent.</span>
		{#if message}<small class:error={state === 'error'} aria-live="polite">{message}</small>{/if}
	</div>
{/if}

<style>
	.visit-report {
		display: grid;
		justify-items: start;
		gap: var(--space-1);
		margin-top: var(--space-4);
	}
	.visit-report button {
		min-height: var(--tap-target);
		padding: 0 var(--space-4);
		border: 1px solid var(--brand-maroon-deep);
		border-radius: 999px;
		background: var(--brand-maroon-deep);
		color: var(--brand-cream);
		font: 740 0.82rem/1 var(--font-display);
		cursor: pointer;
	}
	.visit-report button:hover:not(:disabled) { background: var(--brand-maroon-ink); }
	.visit-report button:disabled {
		cursor: default;
		opacity: 0.78;
	}
	.visit-report span,
	.visit-report small {
		color: var(--color-text-muted);
		font-size: 0.72rem;
		line-height: 1.35;
	}
	.visit-report small.error { color: var(--brand-maroon-deep); }
	.visit-report.compact {
		margin-top: var(--space-3);
	}
	.visit-report.compact button {
		min-height: 2.75rem;
		background: var(--brand-sand);
		color: var(--brand-maroon-deep);
	}
</style>
