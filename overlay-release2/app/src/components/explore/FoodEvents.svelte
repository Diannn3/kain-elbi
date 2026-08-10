<script lang="ts">
	import { onMount } from 'svelte';
	import { activeFoodEvents, upcomingFoodEvents } from '../../lib/data/community-ops';
	import type { FoodEvent } from '../../lib/types';

	let { events }: { events: FoodEvent[] } = $props();
	let now = $state(new Date());

	const active = $derived(activeFoodEvents(events, now));
	const upcoming = $derived(upcomingFoodEvents(events, now, 7));
	const visible = $derived(active.length ? active : upcoming.slice(0, 4));
	const mode = $derived(active.length ? 'Happening now' : 'Coming up');

	onMount(() => {
		const timer = setInterval(() => { now = new Date(); }, 60_000);
		return () => clearInterval(timer);
	});

	function timeLabel(event: FoodEvent) {
		const date = new Date(active.length ? event.endAt : event.startAt);
		return new Intl.DateTimeFormat('en-PH', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			timeZone: 'Asia/Manila',
		}).format(date);
	}
</script>

{#if visible.length}
	<section class="food-events" aria-labelledby="food-events-title">
		<div class="events-heading">
			<div>
				<p class="eyebrow-global">{mode}</p>
				<h2 id="food-events-title">{active.length ? 'Temporary food around Elbi.' : 'Food events worth knowing about.'}</h2>
			</div>
			<a href="/contribute#submit-event">Submit an event →</a>
		</div>

		<div class="event-list">
			{#each visible as event}
				<article>
					<div class="event-time">
						<span>{active.length ? 'Until' : 'Starts'}</span>
						<strong>{timeLabel(event)}</strong>
					</div>
					<div class="event-copy">
						<h3>{event.title}</h3>
						<p>{event.description}</p>
						<div class="event-meta">
							<span>{event.locationName}</span>
							{#if event.organizer}<span>{event.organizer}</span>{/if}
							{#if event.foodTags.length}<span>{event.foodTags.slice(0, 3).join(' · ')}</span>{/if}
						</div>
					</div>
					<a class="event-source" href={event.sourceUrl} target="_blank" rel="noreferrer">
						Event source ↗<span class="sr-only"> (opens in a new tab)</span>
					</a>
				</article>
			{/each}
		</div>

		<p class="event-note">Temporary listings are moderated separately and do not automatically enter Smart Picks.</p>
	</section>
{/if}

<style>
	.food-events { display: grid; gap: var(--space-4); }
	.events-heading { display: flex; align-items: end; justify-content: space-between; gap: var(--space-4); }
	.events-heading h2 {
		max-width: 18ch;
		margin: var(--space-2) 0 0;
		color: var(--brand-maroon-deep);
		font: 770 clamp(1.7rem, 5vw, 2.6rem)/0.98 var(--font-display);
	}
	.events-heading > a {
		min-height: var(--tap-target);
		display: inline-flex;
		align-items: center;
		flex: none;
		color: var(--brand-maroon-deep);
		font-weight: 720;
		text-underline-offset: 0.2em;
	}
	.event-list { border-top: 1px solid var(--color-border); }
	.event-list article {
		display: grid;
		grid-template-columns: 6.5rem minmax(0, 1fr);
		gap: var(--space-4);
		padding: var(--space-5) 0;
		border-bottom: 1px solid var(--color-border);
	}
	.event-time { display: grid; align-content: start; gap: var(--space-1); }
	.event-time span {
		color: var(--brand-orange);
		font: 760 0.68rem/1 var(--font-display);
		letter-spacing: 0.07em;
		text-transform: uppercase;
	}
	.event-time strong { color: var(--brand-maroon-deep); font: 730 0.88rem/1.3 var(--font-display); }
	.event-copy h3 { margin: 0; color: var(--brand-maroon-deep); font: 760 1.15rem/1.1 var(--font-display); }
	.event-copy > p { max-width: 44rem; margin: var(--space-2) 0 0; color: var(--color-text-muted); line-height: 1.5; }
	.event-meta { display: flex; gap: var(--space-2); flex-wrap: wrap; margin-top: var(--space-2); color: var(--color-text-muted); font-size: 0.75rem; }
	.event-meta span + span::before { content: '·'; margin-right: var(--space-2); }
	.event-source {
		grid-column: 2;
		justify-self: start;
		min-height: 2.75rem;
		display: inline-flex;
		align-items: center;
		color: var(--brand-maroon-deep);
		font-size: 0.78rem;
		font-weight: 720;
	}
	.event-note { margin: 0; color: var(--color-text-muted); font-size: 0.76rem; }
	@media (min-width: 760px) {
		.event-list article { grid-template-columns: 7rem minmax(0, 1fr) auto; align-items: center; }
		.event-source { grid-column: auto; }
	}
	@media (max-width: 520px) {
		.events-heading { align-items: start; flex-direction: column; }
		.event-list article { grid-template-columns: 1fr; }
		.event-source { grid-column: 1; }
	}
</style>
