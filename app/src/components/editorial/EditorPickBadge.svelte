<script lang="ts">
  import { onMount } from 'svelte';
  let { placeId }: { placeId:string } = $props();
  let picked = $state(false);
  onMount(() => {
    let active = true;
    fetch(`/api/editor-picks?place=${encodeURIComponent(placeId)}`, { cache:'no-store' })
      .then((response) => response.ok ? response.json() : undefined)
      .then((data) => { if (active) picked = Array.isArray(data?.picks) && data.picks.length > 0; })
      .catch(() => undefined);
    return () => { active = false; };
  });
</script>
{#if picked}<a class="editor-pick" href="/freshie#editors-picks" aria-label="UPPETITE Editor's Pick — view Editor's Picks"><span aria-hidden="true">★</span><strong>Editor's Pick</strong><small>Recommended by UPPETITE</small></a>{/if}
<style>.editor-pick{width:fit-content;display:grid;grid-template-columns:auto auto;gap:.08rem .4rem;align-items:center;margin:0 0 var(--space-3);padding:.55rem .72rem;border:1px solid rgb(230 106 25/.38);border-radius:.8rem;background:rgb(230 106 25/.1);color:var(--brand-maroon-deep);text-decoration:none}.editor-pick>span{grid-row:1/3;color:var(--brand-orange);font-size:1.1rem}.editor-pick strong{font:760 .72rem/1 var(--font-display);letter-spacing:.06em;text-transform:uppercase}.editor-pick small{color:var(--color-text-muted);font-size:.67rem}</style>
