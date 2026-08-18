<script lang="ts">
  import type { Place } from '../../lib/types';
  import { freshnessLabel } from '../../lib/freshness';
  let { place, compact=false }: { place: Place; compact?: boolean } = $props();
</script>
{#if place.shopVerification?.status === 'verified'}
  <span class:compact class="badge" title={`Shop identity ${freshnessLabel(place.shopVerification.verifiedAt).toLowerCase()}`}><span aria-hidden="true">✓</span> Verified shop</span>
{/if}
<style>.badge{display:inline-flex;align-items:center;gap:.35rem;min-height:2rem;padding:0 .7rem;border:1px solid rgb(71 12 17/.22);border-radius:999px;background:var(--brand-sand);color:var(--brand-maroon-deep);font-size:.75rem;font-weight:760}.badge span{display:grid;place-items:center;width:1rem;height:1rem;border-radius:50%;background:var(--brand-maroon-deep);color:var(--brand-cream);font-size:.65rem}.badge.compact{min-height:1.7rem;font-size:.68rem}</style>
