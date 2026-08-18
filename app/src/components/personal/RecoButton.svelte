<script lang="ts">
  import { onMount } from 'svelte';
  import { readPersonalState, writePersonalState, type PersonalState } from '../../lib/personal-state';

  let { placeId, placeName }: { placeId: string; placeName: string } = $props();
  let state = $state<PersonalState>(readPersonalState(undefined));
  let open = $state(false);
  let message = $state('');
  let error = $state(false);

  onMount(() => { state = readPersonalState(); });

  const inDefault = $derived(
    state.recoLists.find((list) => list.id === 'my-recos')?.placeIds.includes(placeId) ?? false,
  );

  function toggle(listId: string) {
    const now = new Date().toISOString();
    const next: PersonalState = {
      ...state,
      recoLists: state.recoLists.map((list) => list.id !== listId ? list : ({
        ...list,
        placeIds: list.placeIds.includes(placeId)
          ? list.placeIds.filter((id) => id !== placeId)
          : [...list.placeIds, placeId].slice(0, 500),
        updatedAt: now,
      })),
    };
    if (!writePersonalState(next)) {
      error = true;
      message = 'Could not update My Recos on this device.';
      return;
    }
    state = next;
    error = false;
    message = 'My Recos updated.';
  }
</script>

<div class="reco-control">
  <button class:active={inDefault} type="button" onclick={() => toggle('my-recos')} aria-pressed={inDefault}>
    {inDefault ? '✓ In My Recos' : '+ My Recos'}
  </button>
  {#if state.recoLists.length > 1}
    <button class="more" type="button" aria-expanded={open} aria-label={`Choose a recommendation list for ${placeName}`} onclick={() => open = !open}>⌄</button>
  {/if}
  {#if open}
    <div class="menu" aria-label={`Recommendation lists for ${placeName}`}>
      {#each state.recoLists as list}
        <button type="button" aria-pressed={list.placeIds.includes(placeId)} onclick={() => toggle(list.id)}>
          {list.placeIds.includes(placeId) ? '✓ ' : ''}{list.name}
        </button>
      {/each}
      <a href="/my">Manage lists →</a>
    </div>
  {/if}
  {#if message}<small class:error aria-live="polite">{message}</small>{/if}
</div>

<style>
  .reco-control { position: relative; display: flex; flex-wrap: wrap; gap: .35rem; align-items: center; }
  .reco-control > button { min-height: var(--tap-target); padding: 0 var(--space-3); border: 1px solid var(--brand-maroon-deep); border-radius: 999px; background: transparent; color: var(--brand-maroon-deep); font-weight: 740; cursor: pointer; }
  .reco-control > button.active { background: var(--brand-maroon-deep); color: var(--brand-cream); }
  .reco-control > button.more { width: var(--tap-target); padding: 0; }
  .menu { position: absolute; z-index: 20; top: calc(100% + .4rem); right: 0; min-width: 12rem; padding: .4rem; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--brand-cream); box-shadow: 0 1rem 2rem rgb(71 12 17 / .16); }
  .menu button, .menu a { width: 100%; min-height: 2.75rem; display: flex; align-items: center; padding: 0 .75rem; border: 0; border-radius: .6rem; background: transparent; color: var(--brand-maroon-deep); font-weight: 680; text-align: left; text-decoration: none; }
  .menu button:hover, .menu a:hover { background: var(--brand-sand); }
  small { flex-basis: 100%; color: var(--color-text-muted); font-size: .7rem; }
  small.error { color: var(--brand-maroon-deep); }
</style>
