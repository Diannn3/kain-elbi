<script lang="ts">
  import { onMount } from 'svelte';
  import type { StaffRole } from '../../lib/auth/authorization';
  let role = $state<StaffRole | undefined>();
  onMount(() => {
    let active = true;
    fetch('/api/staff/me', { credentials:'same-origin', cache:'no-store' })
      .then((r) => r.ok ? r.json() : undefined)
      .then((data) => { if (active && data?.staff === true) role = data.role; })
      .catch(() => undefined);
    return () => { active = false; };
  });
</script>
{#if role}
  <section class="team-card" aria-labelledby="team-tools-title">
    <div><p class="eyebrow-global">Team tools</p><h2 id="team-tools-title">Maintain UPPETITE.</h2><p>Your staff role is <strong>{role.replace('_',' ')}</strong>.</p></div>
    <div class="actions"><a href="/places-ops">Open Places Ops</a>{#if role === 'owner'}<a href="/staff/editor-picks">Manage Editor's Picks</a><a href="/places-ops/access">Manage access</a>{/if}</div>
  </section>
{/if}
<style>.team-card{width:var(--page-wide);margin:-3rem auto 6rem;padding:var(--space-5);display:grid;gap:var(--space-4);border:1px solid rgb(92 16 22/.25);border-radius:var(--radius-xl);background:var(--brand-sand)}h2{margin:var(--space-2) 0 0;color:var(--brand-maroon-deep);font:780 1.7rem/1 var(--font-display)}p:last-child{color:var(--color-text-muted)}.actions{display:flex;flex-wrap:wrap;gap:var(--space-2)}a{min-height:var(--tap-target);display:inline-flex;align-items:center;padding:0 var(--space-3);border:1px solid var(--brand-maroon-deep);border-radius:999px;color:var(--brand-maroon-deep);font-weight:740;text-decoration:none}@media(min-width:800px){.team-card{grid-template-columns:1fr auto;align-items:center}.actions{justify-content:flex-end}}</style>
