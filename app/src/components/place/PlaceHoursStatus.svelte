<script lang="ts">
	import { onMount } from 'svelte';

	let {
		openingHours,
		lat,
		lon,
	}: {
		openingHours: string | null;
		lat: number;
		lon: number;
	} = $props();

	let label = $state(openingHours ? 'Checking source-listed hours…' : 'Hours unavailable');
	let tone = $state<'open' | 'closed' | 'unknown'>('unknown');

	onMount(async () => {
		if (!openingHours) return;
		try {
			const { default: OpeningHours } = await import('opening_hours');
			const parsed = new OpeningHours(openingHours, {
				lat,
				lon,
				address: { country_code: 'ph', state: 'Laguna' },
			});
			const open = parsed.getState();
			label = open ? 'Open now · based on source-listed hours' : 'Closed now · based on source-listed hours';
			tone = open ? 'open' : 'closed';
		} catch {
			label = 'Hours need checking';
			tone = 'unknown';
		}
	});
</script>

<p class="hours-status" data-tone={tone} aria-live="polite">
	<span aria-hidden="true"></span>{label}
</p>

<style>
	.hours-status { display: flex; align-items: flex-start; gap: var(--space-2); margin: 0; color: var(--text-secondary); font-size: 0.82rem; font-weight: 650; line-height: 1.45; }
	.hours-status > span { width: 0.55rem; height: 0.55rem; flex: none; margin-top: 0.3em; border-radius: 50%; background: hsl(40 85% 45%); }
	.hours-status[data-tone='open'] > span { background: hsl(138 48% 32%); }
	.hours-status[data-tone='closed'] > span { background: hsl(2 68% 46%); }
</style>
