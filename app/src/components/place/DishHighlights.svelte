<script lang="ts">
  import type { Place } from '../../lib/types';
  let { place }: { place: Place } = $props();
</script>
{#if place.dishes?.length}
<section class="dishes" aria-labelledby={`dishes-${place.id}`}><p>Dish highlights</p><h3 id={`dishes-${place.id}`}>Search the food, not just the place.</h3><div>{#each place.dishes.slice(0,8) as dish}<article><strong>{dish.name}</strong>{#if dish.pricePhp}<span>₱{dish.pricePhp}</span>{/if}{#if dish.tags?.length}<small>{dish.tags.join(' · ')}</small>{/if}</article>{/each}</div></section>
{/if}
<style>.dishes{margin-top:var(--space-4);padding:var(--space-4);border:1px solid var(--color-border);border-radius:var(--radius-lg);background:var(--brand-cream)}.dishes>p{margin:0;color:var(--brand-maroon-deep);font:760 .68rem/1 var(--font-display);letter-spacing:.08em;text-transform:uppercase}.dishes h3{margin:var(--space-2) 0 0;color:var(--brand-maroon-deep);font:760 1.2rem/1.1 var(--font-display)}.dishes>div{display:grid;gap:var(--space-2);margin-top:var(--space-3)}article{display:grid;grid-template-columns:1fr auto;gap:.25rem var(--space-3);padding:var(--space-3);border-radius:var(--radius-sm);background:var(--brand-sand)}article strong{color:var(--brand-charcoal)}article span{color:var(--brand-maroon-deep);font-weight:760}article small{grid-column:1/-1;color:var(--color-text-muted)}</style>
