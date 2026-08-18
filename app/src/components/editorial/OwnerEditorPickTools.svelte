<script lang="ts">
  import { onMount } from 'svelte';
  let { placeId, placeName }: { placeId:string; placeName:string } = $props();
  let owner = $state(false);
  let pick = $state<any>();
  onMount(async () => {
    try {
      const me = await fetch('/api/staff/me', { cache:'no-store' }).then((r) => r.json());
      if (me?.role !== 'owner') return;
      owner = true;
      const data = await fetch(`/api/editor-picks?place=${encodeURIComponent(placeId)}&includeDrafts=1`, { cache:'no-store' }).then((r) => r.ok ? r.json() : undefined);
      pick = data?.picks?.[0];
    } catch { /* owner tools are optional when auth is unavailable */ }
  });
</script>
{#if owner}<aside class="owner-tools" aria-label={`Owner tools for ${placeName}`}><span>Owner tools</span>{#if pick}<a href={`/staff/editor-picks?edit=${encodeURIComponent(pick.id)}`}>Edit Editor's Pick</a>{#if pick.published}<a href="/freshie#editors-picks">View live pick</a>{/if}{:else}<a href={`/staff/editor-picks?place=${encodeURIComponent(placeId)}`}>★ Add to Editor's Picks</a>{/if}</aside>{/if}
<style>.owner-tools{display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-2);margin-top:var(--space-3);padding:var(--space-3);border:1px dashed rgb(92 16 22/.36);border-radius:var(--radius-md);background:rgb(255 249 241/.55)}span{color:var(--brand-orange);font:760 .68rem/1 var(--font-display);letter-spacing:.08em;text-transform:uppercase}a{min-height:2.5rem;display:inline-flex;align-items:center;padding:0 .75rem;border:1px solid var(--brand-maroon-deep);border-radius:999px;color:var(--brand-maroon-deep);font-size:.75rem;font-weight:720;text-decoration:none}</style>
