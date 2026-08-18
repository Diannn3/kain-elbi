<script lang="ts">
  import { communityBackendConfig, reportPlaceFeedback } from '../../lib/community/backend';
  import type { PlaceFeedbackCategory } from '../../lib/place-feedback';
  let { placeId, placeName }: { placeId: string; placeName: string } = $props();
  let open = $state(false), sending = $state(false), message = $state('');
  const categories: Array<{ value: PlaceFeedbackCategory; label: string }> = [
    { value: 'hours_wrong', label: 'Hours wrong' },
    { value: 'price_menu_wrong', label: 'Price/menu wrong' },
    { value: 'location_wrong', label: 'Location wrong' },
    { value: 'closed', label: 'Looks closed' },
    { value: 'duplicate', label: 'Duplicate' },
    { value: 'other', label: 'Something else' },
  ];
  const configured = communityBackendConfig().configured;
  async function submit(category: PlaceFeedbackCategory) {
    if (!configured) { window.location.assign(`/contribute?place=${encodeURIComponent(placeId)}#report-problem`); return; }
    sending = true; message = '';
    try {
      const result = await reportPlaceFeedback(placeId, category);
      message = result.duplicate ? 'Already counted for this place today.' : 'Thanks — sent to the Places queue.';
      open = false;
    } catch {
      message = 'Could not send that right now. You can still use the contribution form.';
    } finally {
      sending = false;
    }
  }
</script>
<div class="problem">
  <button type="button" aria-expanded={open} onclick={() => open = !open}>Report wrong info</button>
  {#if open}
    <div class="menu" aria-label={`Report an issue with ${placeName}`}>
      <strong>What changed?</strong>
      {#each categories as item}
        <button type="button" disabled={sending} onclick={() => submit(item.value)}>{item.label}</button>
      {/each}
      <a href={`/contribute?place=${encodeURIComponent(placeId)}#report-problem`}>Detailed report →</a>
    </div>
  {/if}
  {#if message}<small aria-live="polite">{message}</small>{/if}
</div>
<style>
  .problem{position:relative;display:grid;gap:.3rem}.problem>button{min-height:var(--tap-target);padding:0 var(--space-3);border:0;background:transparent;color:var(--brand-maroon-deep);font-weight:720;text-decoration:underline;text-underline-offset:.2em}.menu{position:absolute;z-index:20;right:0;bottom:calc(100% + .4rem);width:min(18rem,calc(100vw - 2rem));display:grid;gap:.2rem;padding:.5rem;border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--brand-cream);box-shadow:0 1rem 2rem rgb(71 12 17/.18)}.menu strong{padding:.6rem;color:var(--brand-maroon-deep)}.menu button,.menu a{min-height:2.75rem;display:flex;align-items:center;padding:0 .7rem;border:0;border-radius:.6rem;background:transparent;color:var(--brand-maroon-deep);font-weight:680;text-decoration:none}.menu button:hover,.menu a:hover{background:var(--brand-sand)}small{color:var(--color-text-muted);font-size:.72rem}
</style>
