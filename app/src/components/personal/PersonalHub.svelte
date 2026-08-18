<script lang="ts">
  import { onMount } from 'svelte';
  import type { Anchor } from '../../lib/types';
  import {
    createLocalId,
    emptyPersonalState,
    nextClass,
    readPersonalState,
    routeHref,
    writePersonalState,
    type PersonalState,
    type Weekday,
  } from '../../lib/personal-state';

  let { anchors }: { anchors: Anchor[] } = $props();
  let state = $state<PersonalState>(emptyPersonalState());
  let loaded = $state(false);
  let course = $state('');
  let day = $state<Weekday>(new Date().getDay() as Weekday);
  let startTime = $state('10:00');
  let endTime = $state('11:00');
  let classAnchor = $state(anchors[0]?.id ?? '');
  let routeName = $state('');
  let routeOrigin = $state(anchors[0]?.id ?? '');
  let routeDestination = $state('');
  let routeBreak = $state(45);
  let recoName = $state('');
  let status = $state('');
  let statusError = $state(false);
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const anchorName = (id: string) => anchors.find((anchor) => anchor.id === id)?.name ?? id;
  const upcoming = $derived(loaded ? nextClass(state, anchors) : undefined);

  function upcomingLabel(minutes: number) {
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const rest = minutes % 60;
      return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
    }
    const daysAway = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return hours ? `${daysAway} day${daysAway === 1 ? '' : 's'} ${hours} hr` : `${daysAway} day${daysAway === 1 ? '' : 's'}`;
  }

  onMount(() => {
    state = readPersonalState();
    loaded = true;
  });

  function save(next: PersonalState): boolean {
    if (!writePersonalState(next)) {
      statusError = true;
      status = 'Could not save on this device. Check browser storage permissions and try again.';
      return false;
    }
    state = next;
    statusError = false;
    status = 'Saved on this device.';
    return true;
  }

  function addClass() {
    if (!course.trim() || !classAnchor) { statusError = true; status = 'Add a course and building first.'; return; }
    if (endTime <= startTime) { statusError = true; status = 'Class end time must be after its start time.'; return; }
    const next = { ...state, timetable: [...state.timetable, { id: createLocalId('class'), day, startTime, endTime, course: course.trim(), anchorId: classAnchor }].sort((a,b) => a.day - b.day || a.startTime.localeCompare(b.startTime)) };
    if (save(next)) course = '';
  }

  function addRoute() {
    if (!routeName.trim() || !routeOrigin) return;
    if (save({ ...state, quickRoutes: [{ id: createLocalId('route'), name: routeName.trim(), originId: routeOrigin, ...(routeDestination ? { destinationId: routeDestination } : {}), breakMinutes: routeBreak, createdAt: new Date().toISOString() }, ...state.quickRoutes].slice(0, 20) })) routeName = '';
  }

  function addRecoList() {
    if (!recoName.trim()) return;
    if (save({ ...state, recoLists: [...state.recoLists, { id: createLocalId('reco'), name: recoName.trim(), placeIds: [], updatedAt: new Date().toISOString() }] })) recoName = '';
  }
</script>

<section class="personal-shell" aria-labelledby="personal-title">
  <header>
    <p class="eyebrow-global">Your UPPETITE</p>
    <h1 id="personal-title">Make Elbi food fit your routine.</h1>
    <p>Your timetable, routes, recos, and meal log stay on this device. No account is required.</p>
  </header>

  {#if upcoming}
    <article class="next-card">
      <span>Next class</span>
      <strong>{upcoming.entry.course}</strong>
      <p>{upcoming.anchor.name} · {upcoming.entry.startTime} · starts in {upcomingLabel(upcoming.startsInMinutes)}</p>
    </article>
  {/if}

  {#if status}<p class:error={statusError} class="save-status" aria-live="polite">{status}</p>{/if}

  <div class="personal-grid">
    <section class="panel">
      <div class="panel-heading"><span>01</span><div><h2>Timetable</h2><p>Save recurring classes so UPPETITE can surface what is next.</p></div></div>
      <div class="form-grid">
        <label>Course<input bind:value={course} placeholder="CMSC 150" maxlength="60" /></label>
        <label>Day<select bind:value={day}>{#each days as label, index}<option value={index}>{label}</option>{/each}</select></label>
        <label>Starts<input type="time" bind:value={startTime} /></label>
        <label>Ends<input type="time" bind:value={endTime} /></label>
        <label class="wide">Building<select bind:value={classAnchor}>{#each anchors as anchor}<option value={anchor.id}>{anchor.name}</option>{/each}</select></label>
        <button type="button" onclick={addClass}>Add class</button>
      </div>
      <div class="rows">
        {#each state.timetable as item (item.id)}
          <div class="row"><div><strong>{item.course}</strong><span>{days[item.day]} · {item.startTime}–{item.endTime} · {anchorName(item.anchorId)}</span></div><button type="button" aria-label={`Delete ${item.course}`} onclick={() => save({ ...state, timetable: state.timetable.filter((entry) => entry.id !== item.id) })}>Remove</button></div>
        {:else}<p class="empty">No classes saved yet.</p>{/each}
      </div>
    </section>

    <section class="panel">
      <div class="panel-heading"><span>02</span><div><h2>Quick routes</h2><p>Save routes you repeat so Find becomes one tap.</p></div></div>
      <div class="form-grid">
        <label class="wide">Name<input bind:value={routeName} placeholder="Lunch before ICS" maxlength="80" /></label>
        <label>From<select bind:value={routeOrigin}>{#each anchors as anchor}<option value={anchor.id}>{anchor.name}</option>{/each}</select></label>
        <label>Next class<select bind:value={routeDestination}><option value="">No next class</option>{#each anchors as anchor}<option value={anchor.id}>{anchor.name}</option>{/each}</select></label>
        <label>Break<select bind:value={routeBreak}>{#each [20,30,45,60,90,120] as minutes}<option value={minutes}>{minutes} min</option>{/each}</select></label>
        <button type="button" onclick={addRoute}>Save route</button>
      </div>
      <div class="rows">
        {#each state.quickRoutes as route (route.id)}
          <div class="row route-row"><div><strong>{route.name}</strong><span>{anchorName(route.originId)} → {route.destinationId ? anchorName(route.destinationId) : 'No next class'} · {route.breakMinutes} min</span></div><div class="row-actions"><a href={routeHref(route)}>Find food</a><button type="button" onclick={() => save({ ...state, quickRoutes: state.quickRoutes.filter((item) => item.id !== route.id) })}>Remove</button></div></div>
        {:else}<p class="empty">No quick routes saved yet.</p>{/each}
      </div>
    </section>

    <section class="panel">
      <div class="panel-heading"><span>03</span><div><h2>My Recos</h2><p>Your own lists—not anonymous star ratings.</p></div></div>
      <div class="inline-form"><input bind:value={recoName} placeholder="Coffee recos" maxlength="60" /><button type="button" onclick={addRecoList}>Create list</button></div>
      <div class="rows">
        {#each state.recoLists as list (list.id)}<div class="row"><div><strong>{list.name}</strong><span>{list.placeIds.length} place{list.placeIds.length === 1 ? '' : 's'}</span></div>{#if list.id !== 'my-recos'}<button type="button" onclick={() => save({ ...state, recoLists: state.recoLists.filter((item) => item.id !== list.id) })}>Delete</button>{/if}</div>{/each}
      </div>
    </section>

    <section class="panel">
      <div class="panel-heading"><span>04</span><div><h2>Food journal</h2><p>A private memory of what you actually ate.</p></div></div>
      <div class="rows">
        {#each [...state.journal].sort((a,b) => b.eatenAt.localeCompare(a.eatenAt)).slice(0, 20) as entry (entry.id)}
          <div class="row"><div><strong>{entry.placeName}</strong><span>{entry.dish ?? 'Meal'}{entry.amountPhp ? ` · ₱${entry.amountPhp}` : ''} · {new Date(entry.eatenAt).toLocaleDateString('en-PH')}</span>{#if entry.note}<small>{entry.note}</small>{/if}</div><button type="button" onclick={() => save({ ...state, journal: state.journal.filter((item) => item.id !== entry.id) })}>Remove</button></div>
        {:else}<p class="empty">Your journal is empty. Log a meal from any place page.</p>{/each}
      </div>
    </section>
  </div>
</section>

<style>
  .personal-shell { width: var(--page-wide); margin: 0 auto; padding: clamp(2rem,6vw,5rem) 0 6rem; }
  header { max-width: 55rem; }
  header h1 { max-width: 13ch; margin: var(--space-3) 0 0; color: var(--brand-maroon-deep); font: 820 clamp(2.8rem,9vw,5.5rem)/.92 var(--font-display); letter-spacing: -.05em; }
  header > p:last-child { max-width: 42rem; color: var(--color-text-muted); line-height: 1.6; }
  .next-card { margin-top: var(--space-8); padding: var(--space-5); border-radius: var(--radius-xl); background: var(--brand-gradient); color: var(--brand-cream); }
  .next-card span { font: 760 .72rem/1 var(--font-display); letter-spacing: .1em; text-transform: uppercase; }
  .next-card strong { display:block; margin-top:var(--space-2); font:790 2rem/1 var(--font-display); }
  .next-card p { margin:var(--space-2) 0 0; color:var(--brand-sand); }
  .save-status { max-width: 44rem; margin: var(--space-4) 0 0; color: var(--color-text-muted); font-size: .8rem; }
  .save-status.error { color: var(--brand-maroon-deep); font-weight: 650; }
  .personal-grid { display:grid; gap:var(--space-5); margin-top:var(--space-8); }
  .panel { padding:var(--space-5); border:1px solid var(--color-border); border-radius:var(--radius-xl); background:var(--brand-cream); }
  .panel:nth-child(even) { background:var(--brand-sand); }
  .panel-heading { display:flex; gap:var(--space-3); }
  .panel-heading > span { color:var(--brand-orange); font:760 .75rem/1 var(--font-display); }
  h2 { margin:0; color:var(--brand-maroon-deep); font:780 1.7rem/1 var(--font-display); }
  .panel-heading p { margin:var(--space-2) 0 0; color:var(--color-text-muted); }
  .form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:var(--space-3); margin-top:var(--space-5); }
  label { display:grid; gap:var(--space-1); color:var(--color-text-muted); font-size:.75rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; }
  label.wide { grid-column:1/-1; }
  input,select { min-width:0; min-height:var(--tap-target); padding:0 var(--space-3); border:1px solid var(--color-border); border-radius:var(--radius-sm); background:var(--brand-cream); color:var(--brand-charcoal); font:inherit; text-transform:none; letter-spacing:0; }
  button,a { min-height:var(--tap-target); display:inline-flex; align-items:center; justify-content:center; padding:0 var(--space-3); border:1px solid var(--brand-maroon-deep); border-radius:999px; font-weight:740; }
  button { background:var(--brand-maroon-deep); color:var(--brand-cream); cursor:pointer; }
  a { background:transparent; color:var(--brand-maroon-deep); text-decoration:none; }
  .form-grid > button { align-self:end; }
  .rows { display:grid; margin-top:var(--space-4); border-top:1px solid var(--color-border); }
  .row { display:flex; align-items:center; justify-content:space-between; gap:var(--space-3); padding:var(--space-3) 0; border-bottom:1px solid var(--color-border); }
  .row > div:first-child { min-width:0; display:grid; gap:.2rem; }
  .row strong { color:var(--brand-maroon-deep); }
  .row span,.row small,.empty { color:var(--color-text-muted); font-size:.78rem; line-height:1.4; }
  .row button { min-height:2.6rem; padding-inline:.8rem; background:transparent; color:var(--brand-maroon-deep); }
  .row-actions { display:flex!important; grid-auto-flow:column; gap:var(--space-2)!important; }
  .inline-form { display:flex; gap:var(--space-2); margin-top:var(--space-5); }
  .inline-form input { flex:1; }
  @media(min-width:900px){ .personal-grid{grid-template-columns:1fr 1fr;align-items:start}.panel{padding:var(--space-6)} }
  @media(max-width:480px){ .form-grid{grid-template-columns:1fr}.form-grid label.wide{grid-column:auto}.row{align-items:flex-start;flex-direction:column}.row-actions{width:100%;display:grid!important;grid-template-columns:1fr 1fr}.inline-form{display:grid} }
</style>
