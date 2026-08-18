<script lang="ts">
  import type { OpsDashboard } from '../../lib/ops-dashboard';
  import type { PlaceAuditEvent } from '../../lib/place-audit';
  let { dashboard, auditEvents = [] }: { dashboard: OpsDashboard; auditEvents?: PlaceAuditEvent[] } = $props();
  let query = $state('');
  let only = $state<'all' | 'hours' | 'price' | 'stale' | 'dishes'>('all');
  const filtered = $derived(dashboard.tasks.filter((task) => {
    const q = query.trim().toLocaleLowerCase();
    if (q && !`${task.placeName} ${task.reasons.join(' ')}`.toLocaleLowerCase().includes(q)) return false;
    if (only === 'all') return true;
    if (only === 'hours') return task.reasons.some((r) => r.includes('hours'));
    if (only === 'price') return task.reasons.some((r) => r.includes('price'));
    if (only === 'dishes') return task.reasons.some((r) => r.includes('dish'));
    return task.reasons.some((r) => r.includes('Review') || r.includes('Never'));
  }));
</script>
<section class="ops" aria-labelledby="ops-title">
  <header><p class="eyebrow-global">Places Team · No PII</p><h1 id="ops-title">Data health, not guesswork.</h1><p>This operational view is generated from UPPETITE's canonical place data. It prioritizes stale and incomplete records without exposing contributor identities.</p></header>
  <div class="metrics">
    <article><span>Places</span><strong>{dashboard.totals.places}</strong></article>
    <article><span>Stale / unchecked</span><strong>{dashboard.totals.stale}</strong></article>
    <article><span>Missing hours</span><strong>{dashboard.totals.missingHours}</strong></article>
    <article><span>Missing price</span><strong>{dashboard.totals.missingPrice}</strong></article>
    <article><span>Missing meal tags</span><strong>{dashboard.totals.missingMealTags}</strong></article>
    <article><span>Missing dishes</span><strong>{dashboard.totals.missingDishes}</strong></article>
    <article><span>Open reports</span><strong>{dashboard.totals.openReports}</strong></article>
    <article><span>Verified shops</span><strong>{dashboard.totals.verifiedShops}</strong></article>
  </div>

  <section class="queue" aria-labelledby="queue-title">
    <div class="heading"><div><p>Verification queue</p><h2 id="queue-title">Highest-impact checks first.</h2></div><small>Generated {new Date(dashboard.generatedAt).toLocaleString('en-PH')}</small></div>
    <div class="filters"><input bind:value={query} type="search" placeholder="Search place or issue" aria-label="Search verification queue" /><select bind:value={only} aria-label="Filter verification queue"><option value="all">All tasks</option><option value="stale">Stale</option><option value="hours">Missing hours</option><option value="price">Missing price</option><option value="dishes">Missing dishes</option></select></div>
    <div class="tasks">
      {#each filtered.slice(0, 100) as task, index (task.placeId)}
        <article><span class="rank">{String(index + 1).padStart(2, '0')}</span><div><strong>{task.placeName}</strong>{#if task.openReports > 0}<span class="report-badge">{task.openReports} report{task.openReports === 1 ? '' : 's'}</span>{/if}<p>{task.reasons.join(' · ')}</p></div><b>{task.priority}</b><div class="task-actions"><a href={`/place/${encodeURIComponent(task.placeId)}`} target="_blank">Open</a><a href={`/contribute?place=${encodeURIComponent(task.placeId)}#suggest-edit`} target="_blank">Verify</a></div></article>
      {:else}<p class="empty">No tasks match this filter.</p>{/each}
    </div>
  </section>

  <section class="audit" aria-labelledby="audit-title">
    <div class="heading"><div><p>Audit trail</p><h2 id="audit-title">What changed, when, and why.</h2></div></div>
    {#if auditEvents.length}
      <div class="audit-list">{#each [...auditEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50) as event}<article><time datetime={event.createdAt}>{new Date(event.createdAt).toLocaleString('en-PH')}</time><strong>{event.placeName ?? event.placeId}</strong><span>{event.action} · {event.field} · {event.source}</span>{#if event.reason}<p>{event.reason}</p>{/if}</article>{/each}</div>
    {:else}<div class="empty-audit"><strong>No exported audit events yet.</strong><p>The database migration included with this feature pack stores immutable reviewed changes. Export approved events into <code>data/place_audit.json</code> when you want a static history snapshot here.</p></div>{/if}
  </section>
</section>
<style>
  .ops{width:var(--page-wide);margin:0 auto;padding:clamp(2rem,6vw,5rem) 0 6rem}.ops>header{max-width:58rem}.ops h1{max-width:12ch;margin:var(--space-3) 0;color:var(--brand-maroon-deep);font:820 clamp(2.8rem,9vw,5.4rem)/.92 var(--font-display);letter-spacing:-.05em}.ops>header>p:last-child{max-width:48rem;color:var(--color-text-muted);line-height:1.6}.metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-2);margin-top:var(--space-7)}.metrics article{padding:var(--space-4);border:1px solid var(--color-border);border-radius:var(--radius-lg);background:var(--brand-cream)}.metrics span{display:block;color:var(--color-text-muted);font-size:.72rem;font-weight:720;text-transform:uppercase;letter-spacing:.06em}.metrics strong{display:block;margin-top:var(--space-2);color:var(--brand-maroon-deep);font:800 2.2rem/1 var(--font-display)}.queue,.audit{margin-top:var(--space-7);padding:var(--space-5);border:1px solid var(--color-border);border-radius:var(--radius-xl);background:var(--brand-sand)}.heading{display:flex;justify-content:space-between;gap:var(--space-4);align-items:end}.heading p{margin:0;color:var(--brand-orange);font:760 .7rem/1 var(--font-display);letter-spacing:.08em;text-transform:uppercase}.heading h2{margin:var(--space-2) 0 0;color:var(--brand-maroon-deep);font:780 clamp(1.7rem,5vw,2.5rem)/.98 var(--font-display)}.heading small{color:var(--color-text-muted)}.filters{display:grid;gap:var(--space-2);margin-top:var(--space-4)}input,select{min-height:var(--tap-target);padding:0 var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-sm);background:var(--brand-cream);font:inherit}.tasks{display:grid;margin-top:var(--space-4)}.tasks>article{display:grid;grid-template-columns:2rem minmax(0,1fr) auto;gap:var(--space-3);align-items:start;padding:var(--space-3) 0;border-top:1px solid var(--color-border)}.rank{color:var(--brand-orange);font:760 .7rem/1 var(--font-display)}.tasks strong{color:var(--brand-maroon-deep)}.report-badge{display:inline-flex;width:max-content;margin-top:.3rem;padding:.22rem .45rem;border-radius:999px;background:rgb(230 106 25/.12);color:var(--brand-maroon-deep);font-size:.68rem;font-weight:760}.tasks p{margin:.25rem 0 0;color:var(--color-text-muted);font-size:.78rem}.tasks>article>b{color:var(--brand-maroon-deep);font:800 1.1rem/1 var(--font-display)}.task-actions{grid-column:2/-1;display:flex;gap:var(--space-2)}.task-actions a{min-height:2.6rem;display:inline-flex;align-items:center;padding:0 .8rem;border:1px solid var(--brand-maroon-deep);border-radius:999px;color:var(--brand-maroon-deep);font-size:.75rem;font-weight:720;text-decoration:none}.audit-list{display:grid;margin-top:var(--space-4)}.audit-list article{display:grid;grid-template-columns:minmax(8rem,.5fr) 1fr 1fr;gap:var(--space-3);padding:var(--space-3) 0;border-top:1px solid var(--color-border);font-size:.8rem}.audit-list time,.audit-list span{color:var(--color-text-muted)}.audit-list p{grid-column:2/-1;margin:0;color:var(--color-text-muted)}.empty-audit{margin-top:var(--space-4);padding:var(--space-4);border-radius:var(--radius-md);background:var(--brand-cream)}.empty-audit strong{color:var(--brand-maroon-deep)}.empty-audit p{color:var(--color-text-muted);line-height:1.55}.empty-audit code{color:var(--brand-maroon-deep)}@media(min-width:760px){.metrics{grid-template-columns:repeat(3,minmax(0,1fr))}.filters{grid-template-columns:1fr 14rem}.tasks>article{grid-template-columns:2rem minmax(0,1fr) auto auto;align-items:center}.task-actions{grid-column:auto}}@media(max-width:600px){.audit-list article{grid-template-columns:1fr}.audit-list p{grid-column:auto}.heading{align-items:flex-start;flex-direction:column}}
</style>
