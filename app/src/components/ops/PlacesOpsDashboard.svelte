<script lang="ts">
  import type { OpsDashboard } from '../../lib/ops-dashboard';
  import type { PlaceAuditEvent } from '../../lib/place-audit';
  import { feedbackCategoryLabel } from '../../lib/place-feedback';
  import type { OpsFeedbackRow } from '../../lib/ops-server';
  import type { ResearchOpsQueue, ResearchRecommendation } from '../../lib/research-ops';
  import { canEditPlaces, type StaffRole } from '../../lib/auth/authorization';

  let {
    dashboard,
    researchQueue,
    auditEvents = [],
    feedbackRows = [],
    role,
    placeNames = {},
  }: {
    dashboard: OpsDashboard;
    researchQueue: ResearchOpsQueue;
    auditEvents?: PlaceAuditEvent[];
    feedbackRows?: OpsFeedbackRow[];
    role: StaffRole;
    placeNames?: Record<string, string>;
  } = $props();

  let query = $state('');
  let only = $state<'all' | 'hours' | 'price' | 'stale' | 'dishes'>('all');
  let updating = $state('');
  let actionMessage = $state('');
  const editable = $derived(canEditPlaces(role));
  const activeFeedback = $derived(feedbackRows.filter((row) => row.status === 'open' || row.status === 'reviewing'));
  const researchItems = $derived(researchQueue.items.filter((item) => item.recommendation !== 'no_change'));
  const filtered = $derived(dashboard.tasks.filter((task) => {
    const q = query.trim().toLocaleLowerCase();
    if (q && !`${task.placeName} ${task.reasons.join(' ')}`.toLocaleLowerCase().includes(q)) return false;
    if (only === 'all') return true;
    if (only === 'hours') return task.reasons.some((r) => r.includes('hours'));
    if (only === 'price') return task.reasons.some((r) => r.includes('price'));
    if (only === 'dishes') return task.reasons.some((r) => r.includes('dish'));
    return task.reasons.some((r) => r.includes('Review') || r.includes('Never'));
  }));

  const recommendationLabels: Record<ResearchRecommendation, string> = {
    conflict_review: 'Conflict',
    needs_corroboration: 'Needs corroboration',
    ready_for_review: 'Ready for review',
    manual_review: 'Manual review',
    needs_more_evidence: 'Needs evidence',
    evidence_only: 'Evidence only',
    no_change: 'No change',
  };

  function compactValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value); }
    catch { return String(value); }
  }

  async function setFeedbackStatus(id: string, status: 'reviewing' | 'resolved' | 'dismissed') {
    updating = id;
    actionMessage = '';
    try {
      const response = await fetch(`/api/ops/feedback/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('update');
      location.reload();
    } catch {
      actionMessage = 'Could not update that report. Your access may have changed.';
      updating = '';
    }
  }
</script>

<section class="ops" aria-labelledby="ops-title">
  <header>
    <p class="eyebrow-global">Places Team · Private</p>
    <h1 id="ops-title">Data health, not guesswork.</h1>
    <p>Signed in as <strong>{role.replace('_', ' ')}</strong>. Live feedback, research proposals, and audit data are loaded only after server-side authorization.</p>
  </header>

  <div class="metrics">
    <article><span>Places</span><strong>{dashboard.totals.places}</strong></article>
    <article><span>Stale / unchecked</span><strong>{dashboard.totals.stale}</strong></article>
    <article><span>Missing hours</span><strong>{dashboard.totals.missingHours}</strong></article>
    <article><span>Missing price</span><strong>{dashboard.totals.missingPrice}</strong></article>
    <article><span>Research review</span><strong>{researchItems.length}</strong></article>
    <article><span>New candidates</span><strong>{researchQueue.candidatesPending}</strong></article>
    <article><span>Open reports</span><strong>{dashboard.totals.openReports}</strong></article>
    <article><span>Verified shops</span><strong>{dashboard.totals.verifiedShops}</strong></article>
  </div>

  <section class="research" aria-labelledby="research-title">
    <div class="heading research-heading">
      <div>
        <p>Research evidence</p>
        <h2 id="research-title">Claims waiting for a human decision.</h2>
      </div>
      <div class="research-actions">
        {#if researchQueue.generatedAt}<small>Generated {new Date(researchQueue.generatedAt).toLocaleString('en-PH')}</small>{/if}
        <a href="/api/ops/research-export">Export review CSV</a>
      </div>
    </div>
    <p class="research-note">Agent research never edits the canonical catalog directly. Export this queue, review it in Sheets, then apply the reviewed CSV through the research decision tool. Stale queue IDs are rejected automatically.</p>
    {#if researchQueue.danglingClaims > 0}
      <p class="research-warning" role="alert">Research publication is blocked: {researchQueue.danglingClaims} dangling claim{researchQueue.danglingClaims === 1 ? '' : 's'} must be repaired.</p>
    {/if}
    <div class="research-list">
      {#each researchItems.slice(0, 80) as item (item.id)}
        <article class:high-risk={item.risk === 'high'}>
          <div class="research-title-row">
            <div>
              <strong>{item.placeName}</strong>
              <span>{item.field.replaceAll('_', ' ')}</span>
            </div>
            <b>{recommendationLabels[item.recommendation]}</b>
          </div>
          <div class="research-values">
            <div><span>Current</span><code>{compactValue(item.currentValue)}</code></div>
            <div>
              <span>Proposed</span>
              {#each item.proposals as proposal, index}
                <div class="proposal">
                  <code>{compactValue(proposal.value)}</code>
                  <small>{Math.round(proposal.confidence * 100)}% evidence confidence · {proposal.independentSources} independent source{proposal.independentSources === 1 ? '' : 's'} · {proposal.freshest}</small>
                  {#if proposal.sourceUrls.length}
                    <nav aria-label={`Evidence sources for ${item.placeName}`}>
                      {#each proposal.sourceUrls.slice(0, 4) as url, sourceIndex}
                        <a href={url} target="_blank" rel="noreferrer">Source {sourceIndex + 1}</a>
                      {/each}
                    </nav>
                  {/if}
                </div>
                {#if index < item.proposals.length - 1}<hr />{/if}
              {/each}
            </div>
          </div>
          {#if item.reasons.length}<p>{item.reasons.join(' · ')}</p>{/if}
        </article>
      {:else}
        <p class="empty">No research claims currently need a human decision.</p>
      {/each}
    </div>
  </section>

  <section class="queue" aria-labelledby="queue-title">
    <div class="heading">
      <div><p>Verification queue</p><h2 id="queue-title">Highest-impact checks first.</h2></div>
      <small>Generated {new Date(dashboard.generatedAt).toLocaleString('en-PH')}</small>
    </div>
    <div class="filters">
      <input bind:value={query} type="search" placeholder="Search place or issue" aria-label="Search verification queue" />
      <select bind:value={only} aria-label="Filter verification queue">
        <option value="all">All tasks</option>
        <option value="stale">Stale</option>
        <option value="hours">Missing hours</option>
        <option value="price">Missing price</option>
        <option value="dishes">Missing dishes</option>
      </select>
    </div>
    <div class="tasks">
      {#each filtered.slice(0, 100) as task, index (task.placeId)}
        <article>
          <span class="rank">{String(index + 1).padStart(2, '0')}</span>
          <div>
            <strong>{task.placeName}</strong>
            {#if task.openReports > 0}<span class="report-badge">{task.openReports} report{task.openReports === 1 ? '' : 's'}</span>{/if}
            <p>{task.reasons.join(' · ')}</p>
          </div>
          <b>{task.priority}</b>
          <div class="task-actions">
            <a href={`/place/${encodeURIComponent(task.placeId)}`} target="_blank">Open</a>
            <a href={`/contribute?place=${encodeURIComponent(task.placeId)}#suggest-edit`} target="_blank">Verify</a>
          </div>
        </article>
      {:else}
        <p class="empty">No tasks match this filter.</p>
      {/each}
    </div>
  </section>

  <section class="feedback" aria-labelledby="feedback-title">
    <div class="heading"><div><p>Community reports</p><h2 id="feedback-title">Review what students flagged.</h2></div></div>
    {#if actionMessage}<p class="action-message" role="alert">{actionMessage}</p>{/if}
    <div class="feedback-list">
      {#each activeFeedback as row (row.id)}
        <article>
          <div><strong>{placeNames[row.placeId] ?? row.placeId}</strong><span>{feedbackCategoryLabel(row.category)} · {row.status} · {new Date(row.createdAt).toLocaleString('en-PH')}</span></div>
          {#if editable}
            <div class="feedback-actions">
              {#if row.status === 'open'}<button type="button" disabled={updating === row.id} onclick={() => setFeedbackStatus(row.id, 'reviewing')}>Reviewing</button>{/if}
              <button type="button" disabled={updating === row.id} onclick={() => setFeedbackStatus(row.id, 'resolved')}>Resolve</button>
              <button class="quiet" type="button" disabled={updating === row.id} onclick={() => setFeedbackStatus(row.id, 'dismissed')}>Dismiss</button>
            </div>
          {/if}
        </article>
      {:else}
        <p class="empty">No open community reports.</p>
      {/each}
    </div>
  </section>

  <section class="audit" aria-labelledby="audit-title">
    <div class="heading"><div><p>Audit trail</p><h2 id="audit-title">What changed, when, and why.</h2></div></div>
    {#if auditEvents.length}
      <div class="audit-list">
        {#each [...auditEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50) as event}
          <article>
            <time datetime={event.createdAt}>{new Date(event.createdAt).toLocaleString('en-PH')}</time>
            <strong>{event.placeName ?? event.placeId}</strong>
            <span>{event.action} · {event.field} · {event.source}</span>
            {#if event.reason}<p>{event.reason}</p>{/if}
          </article>
        {/each}
      </div>
    {:else}
      <div class="empty-audit"><strong>No audit events yet.</strong><p>Reviewed changes will appear here without publishing a static private snapshot.</p></div>
    {/if}
  </section>
</section>

<style>
  .ops{width:var(--page-wide);margin:0 auto;padding:clamp(2rem,6vw,5rem) 0 6rem}.ops>header{max-width:58rem}.ops h1{max-width:12ch;margin:var(--space-3) 0;color:var(--brand-maroon-deep);font:820 clamp(2.8rem,9vw,5.4rem)/.92 var(--font-display);letter-spacing:-.05em}.ops>header>p:last-child{max-width:48rem;color:var(--color-text-muted);line-height:1.6}.metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-2);margin-top:var(--space-7)}.metrics article{padding:var(--space-4);border:1px solid var(--color-border);border-radius:var(--radius-lg);background:var(--brand-cream)}.metrics span{display:block;color:var(--color-text-muted);font-size:.72rem;font-weight:720;text-transform:uppercase;letter-spacing:.06em}.metrics strong{display:block;margin-top:var(--space-2);color:var(--brand-maroon-deep);font:800 2.2rem/1 var(--font-display)}
  .queue,.feedback,.audit,.research{margin-top:var(--space-7);padding:var(--space-5);border:1px solid var(--color-border);border-radius:var(--radius-xl);background:var(--brand-sand)}.heading{display:flex;justify-content:space-between;gap:var(--space-4);align-items:end}.heading p{margin:0;color:var(--brand-orange);font:760 .7rem/1 var(--font-display);letter-spacing:.08em;text-transform:uppercase}.heading h2{margin:var(--space-2) 0 0;color:var(--brand-maroon-deep);font:780 clamp(1.7rem,5vw,2.5rem)/.98 var(--font-display)}.heading small{color:var(--color-text-muted)}
  .research{background:var(--brand-cream)}.research-heading{align-items:flex-start}.research-actions{display:flex;flex-direction:column;align-items:flex-end;gap:.65rem}.research-actions>a{min-height:2.6rem;display:inline-flex;align-items:center;padding:0 .9rem;border-radius:999px;background:var(--brand-maroon-deep);color:var(--brand-cream);font-size:.76rem;font-weight:760;text-decoration:none}.research-note{max-width:58rem;margin:var(--space-3) 0 0;color:var(--color-text-muted);font-size:.82rem;line-height:1.55}.research-warning{padding:.8rem 1rem;border-radius:var(--radius-sm);background:rgb(230 106 25/.12);color:var(--brand-maroon-deep);font-weight:720}.research-list{display:grid;gap:var(--space-2);margin-top:var(--space-4)}.research-list>article{padding:var(--space-4);border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--brand-sand)}.research-list>article.high-risk{border-left:.3rem solid var(--brand-orange)}.research-title-row{display:flex;justify-content:space-between;gap:var(--space-3);align-items:flex-start}.research-title-row>div{display:grid;gap:.2rem}.research-title-row strong{color:var(--brand-maroon-deep)}.research-title-row span{color:var(--color-text-muted);font-size:.72rem;text-transform:uppercase;letter-spacing:.05em}.research-title-row>b{padding:.3rem .55rem;border-radius:999px;background:rgb(92 16 22/.08);color:var(--brand-maroon-deep);font-size:.68rem}.research-values{display:grid;gap:var(--space-3);margin-top:var(--space-3)}.research-values>div{display:grid;gap:.4rem;min-width:0}.research-values>div>span{color:var(--color-text-muted);font-size:.68rem;font-weight:760;text-transform:uppercase;letter-spacing:.05em}.research-values code{display:block;max-width:100%;overflow-wrap:anywhere;white-space:normal;color:var(--brand-charcoal);font:650 .78rem/1.45 var(--font-body);background:transparent}.proposal{display:grid;gap:.35rem}.proposal small{color:var(--color-text-muted);font-size:.7rem;line-height:1.45}.proposal nav{display:flex;flex-wrap:wrap;gap:.35rem}.proposal nav a{color:var(--brand-maroon-deep);font-size:.7rem;font-weight:700}.research-values hr{width:100%;border:0;border-top:1px solid var(--color-border)}.research-list>article>p{margin:.8rem 0 0;color:var(--color-text-muted);font-size:.76rem;line-height:1.5}
  .filters{display:grid;gap:var(--space-2);margin-top:var(--space-4)}input,select{min-height:var(--tap-target);padding:0 var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-sm);background:var(--brand-cream);font:inherit}.tasks{display:grid;margin-top:var(--space-4)}.tasks>article{display:grid;grid-template-columns:2rem minmax(0,1fr) auto;gap:var(--space-3);align-items:start;padding:var(--space-3) 0;border-top:1px solid var(--color-border)}.rank{color:var(--brand-orange);font:760 .7rem/1 var(--font-display)}.tasks strong{color:var(--brand-maroon-deep)}.report-badge{display:inline-flex;width:max-content;margin-top:.3rem;padding:.22rem .45rem;border-radius:999px;background:rgb(230 106 25/.12);color:var(--brand-maroon-deep);font-size:.68rem;font-weight:760}.tasks p{margin:.25rem 0 0;color:var(--color-text-muted);font-size:.78rem}.tasks>article>b{color:var(--brand-maroon-deep);font:800 1.1rem/1 var(--font-display)}.task-actions{grid-column:2/-1;display:flex;gap:var(--space-2)}.task-actions a,.feedback-actions button{min-height:2.6rem;display:inline-flex;align-items:center;padding:0 .8rem;border:1px solid var(--brand-maroon-deep);border-radius:999px;color:var(--brand-maroon-deep);background:transparent;font-size:.75rem;font-weight:720;text-decoration:none}.feedback-list{display:grid;margin-top:var(--space-4)}.feedback-list>article{display:grid;gap:var(--space-3);padding:var(--space-3) 0;border-top:1px solid var(--color-border)}.feedback-list>article>div:first-child{display:grid;gap:.25rem}.feedback-list span{color:var(--color-text-muted);font-size:.78rem}.feedback-actions{display:flex;flex-wrap:wrap;gap:.35rem}.feedback-actions button{cursor:pointer}.feedback-actions button.quiet{border-color:rgb(92 16 22/.22)}.action-message{color:var(--brand-maroon-deep);font-weight:680}.audit-list{display:grid;margin-top:var(--space-4)}.audit-list article{display:grid;grid-template-columns:minmax(8rem,.5fr) 1fr 1fr;gap:var(--space-3);padding:var(--space-3) 0;border-top:1px solid var(--color-border);font-size:.8rem}.audit-list time,.audit-list span{color:var(--color-text-muted)}.audit-list p{grid-column:2/-1;margin:0;color:var(--color-text-muted)}.empty-audit{margin-top:var(--space-4);padding:var(--space-4);border-radius:var(--radius-md);background:var(--brand-cream)}.empty-audit strong{color:var(--brand-maroon-deep)}.empty-audit p,.empty{color:var(--color-text-muted);line-height:1.55}
  @media(min-width:760px){.metrics{grid-template-columns:repeat(4,minmax(0,1fr))}.filters{grid-template-columns:1fr 14rem}.tasks>article{grid-template-columns:2rem minmax(0,1fr) auto auto;align-items:center}.task-actions{grid-column:auto}.feedback-list>article{grid-template-columns:1fr auto;align-items:center}.research-values{grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr)}}
  @media(max-width:600px){.audit-list article{grid-template-columns:1fr}.audit-list p{grid-column:auto}.heading{align-items:flex-start;flex-direction:column}.research-actions{align-items:flex-start}.research-title-row{flex-direction:column}}
</style>
