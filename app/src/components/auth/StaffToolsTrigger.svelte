<script lang="ts">
  import { onMount } from 'svelte';
  import type { StaffRole } from '../../lib/auth/authorization';
  let { home = false }: { home?: boolean } = $props();
  let role = $state<StaffRole | undefined>();
  let open = $state(false);
  let root: HTMLDivElement | undefined;

  onMount(() => {
    let active = true;
    fetch('/api/staff/me', { credentials: 'same-origin', cache: 'no-store' })
      .then((response) => response.ok ? response.json() : undefined)
      .then((data) => { if (active && data?.staff === true) role = data.role; })
      .catch(() => undefined);
    const onPointer = (event: PointerEvent) => {
      if (open && root && !root.contains(event.target as Node)) open = false;
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') open = false; };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => { active = false; document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey); };
  });
</script>

{#if role}
  <div class="staff-tools" bind:this={root}>
    <button class:home class="trigger" type="button" aria-haspopup="menu" aria-expanded={open} onclick={() => open = !open}>
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3 19 6v5c0 4.5-2.9 8.1-7 10-4.1-1.9-7-5.5-7-10V6l7-3Z"/><path d="m9.5 12 1.6 1.6 3.6-4"/></svg>
      <span>Team</span>
    </button>
    {#if open}
      <div class="menu" role="menu">
        <a role="menuitem" href="/places-ops">Places Ops</a>
        {#if role === 'owner'}
          <a role="menuitem" href="/staff/editor-picks">Editor's Picks</a>
          <a role="menuitem" href="/places-ops/access">Manage Access</a>
        {/if}
        <form action="/api/auth/logout" method="post"><button role="menuitem" type="submit">Sign out</button></form>
      </div>
    {/if}
  </div>
{/if}

<style>
  .staff-tools{position:relative;flex:none}.trigger{min-height:var(--tap-target);display:inline-flex;align-items:center;gap:.45rem;padding:0 var(--space-3);border:1px solid rgb(92 16 22/.28);border-radius:.9rem;background:transparent;color:var(--brand-maroon-deep);font:740 .82rem/1 var(--font-display);cursor:pointer}.trigger.home{border-color:rgb(255 249 241/.72);background:rgb(255 249 241/.08);color:var(--brand-cream)}.trigger.home:hover,.trigger.home:focus-visible{background:rgb(255 249 241/.16)}.trigger svg{width:1.05rem;height:1.05rem;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.menu{position:absolute;z-index:80;top:calc(100% + .45rem);right:0;min-width:12.5rem;padding:.4rem;border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--brand-cream);box-shadow:0 1rem 2.5rem rgb(71 12 17/.18)}.menu a,.menu button{width:100%;min-height:2.75rem;display:flex;align-items:center;padding:0 .75rem;border:0;border-radius:.65rem;background:transparent;color:var(--brand-maroon-deep);font:680 .82rem/1.2 var(--font-display);text-align:left;text-decoration:none;cursor:pointer}.menu a:hover,.menu button:hover,.menu a:focus-visible,.menu button:focus-visible{background:var(--brand-sand)}.menu form{margin:0;border-top:1px solid var(--color-border);padding-top:.25rem}@media(max-width:759px){.staff-tools{display:none}}
</style>
