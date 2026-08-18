<script lang="ts">
  import { createLocalId, readPersonalState, writePersonalState } from '../../lib/personal-state';

  let { placeId, placeName }: { placeId: string; placeName: string } = $props();
  let open = $state(false);
  let dish = $state('');
  let amount = $state('');
  let note = $state('');
  let saved = $state(false);
  let message = $state('');
  let error = $state(false);

  function resetForm() {
    dish = '';
    amount = '';
    note = '';
  }

  function logMeal() {
    message = '';
    error = false;

    const trimmedAmount = amount.trim();
    let amountPhp: number | undefined;
    if (trimmedAmount) {
      const parsed = Number(trimmedAmount.replace(/,/g, ''));
      if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 10_000) {
        error = true;
        message = 'Enter an amount from ₱1 to ₱10,000, or leave it blank.';
        return;
      }
      amountPhp = Math.round(parsed);
    }

    const state = readPersonalState();
    state.journal.unshift({
      id: createLocalId('meal'),
      placeId,
      placeName,
      ...(dish.trim() ? { dish: dish.trim().slice(0, 100) } : {}),
      ...(amountPhp === undefined ? {} : { amountPhp }),
      ...(note.trim() ? { note: note.trim().slice(0, 240) } : {}),
      eatenAt: new Date().toISOString(),
    });
    state.journal = state.journal.slice(0, 1000);

    if (!writePersonalState(state)) {
      error = true;
      message = 'Could not save this meal on your device. Your entry is still here so you can try again.';
      return;
    }

    saved = true;
    message = 'Meal saved on this device.';
    open = false;
    resetForm();
  }
</script>

<div class="journal">
  <button type="button" aria-expanded={open} onclick={() => { open = !open; error = false; message = ''; }}>
    {saved ? '✓ Meal logged' : 'Log meal'}
  </button>

  {#if open}
    <form class="form" onsubmit={(event) => { event.preventDefault(); logMeal(); }}>
      <strong>What did you eat?</strong>
      <label>Dish <input bind:value={dish} maxlength="100" placeholder="Optional" /></label>
      <label>Spent <input bind:value={amount} inputmode="numeric" autocomplete="off" placeholder="₱ optional" /></label>
      <label>Private note <textarea bind:value={note} maxlength="240" rows="2" placeholder="Optional"></textarea></label>
      <div class="actions">
        <button type="submit">Save meal</button>
        <button class="quiet" type="button" onclick={() => { open = false; error = false; message = ''; }}>Cancel</button>
      </div>
    </form>
  {/if}

  {#if message}<small class:error aria-live="polite">{message}</small>{/if}
</div>

<style>
  .journal { position: relative; display: grid; gap: .35rem; }
  .journal > button { min-height: var(--tap-target); padding: 0 var(--space-3); border: 1px solid var(--brand-maroon-deep); border-radius: 999px; background: transparent; color: var(--brand-maroon-deep); font-weight: 720; cursor: pointer; }
  .form { position: absolute; z-index: 30; right: 0; bottom: calc(100% + .45rem); width: min(20rem, calc(100vw - 2rem)); display: grid; gap: var(--space-3); padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--brand-cream); box-shadow: 0 1rem 2.4rem rgb(71 12 17 / .2); }
  .form > strong { color: var(--brand-maroon-deep); }
  label { display: grid; gap: .3rem; color: var(--color-text-muted); font-size: .72rem; font-weight: 700; }
  input, textarea { width: 100%; min-width: 0; padding: .7rem; border: 1px solid var(--color-border); border-radius: .65rem; background: white; color: var(--brand-charcoal); font: inherit; resize: vertical; }
  .actions { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); }
  .actions button { min-height: 2.75rem; border: 1px solid var(--brand-maroon-deep); border-radius: 999px; background: var(--brand-maroon-deep); color: var(--brand-cream); font-weight: 720; cursor: pointer; }
  .actions .quiet { background: transparent; color: var(--brand-maroon-deep); }
  small { color: var(--color-text-muted); font-size: .72rem; line-height: 1.35; }
  small.error { color: var(--brand-maroon-deep); }
</style>
