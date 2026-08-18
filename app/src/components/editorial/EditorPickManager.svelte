<script lang="ts">
  import { EDITOR_PICK_TAGS, EDITOR_PICK_TAG_LABELS, type EditorPickRecord, type EditorPickTag } from '../../lib/editor-picks';
  type PlaceSummary = { id:string; name:string; category:string };
  let { picks, places, initialPlaceId = '', initialEditId = '' }: { picks:EditorPickRecord[]; places:PlaceSummary[]; initialPlaceId?:string; initialEditId?:string } = $props();
  let selectedId = $state(initialEditId || '');
  let placeId = $state(initialPlaceId || '');
  let tagline = $state('');
  let editorNote = $state('');
  let reasonTags = $state<EditorPickTag[]>([]);
  let published = $state(false);
  let status = $state('');
  let busy = $state(false);
  const placeName = (id:string) => places.find((place) => place.id === id)?.name ?? id;
  const availablePlaces = $derived(places.filter((place) => !picks.some((pick) => pick.placeId === place.id) || picks.find((pick)=>pick.id===selectedId)?.placeId === place.id));

  function loadPick(id:string) {
    selectedId = id;
    const pick = picks.find((item) => item.id === id);
    if (!pick) { placeId='';tagline='';editorNote='';reasonTags=[];published=false;return; }
    placeId=pick.placeId;tagline=pick.tagline;editorNote=pick.editorNote;reasonTags=[...pick.reasonTags];published=pick.published;
  }
  if (selectedId) loadPick(selectedId);
  function toggleTag(tag:EditorPickTag) { reasonTags = reasonTags.includes(tag) ? reasonTags.filter((item)=>item!==tag) : [...reasonTags,tag]; }
  async function save() {
    if (!placeId || !tagline.trim() || !editorNote.trim()) { status='Choose a place and add both a tagline and note.'; return; }
    busy=true;status='';
    const payload={ placeId, tagline, editorNote, reasonTags, published };
    try {
      const response=await fetch(selectedId ? `/api/editor-picks/${selectedId}` : '/api/editor-picks', { method:selectedId?'PATCH':'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      if (!response.ok) throw new Error('save');
      location.reload();
    } catch { status='Could not save this pick. Check your session and try again.'; busy=false; }
  }
  async function remove(id:string) {
    if (!confirm('Remove this Editor\'s Pick?')) return;
    busy=true;
    const response=await fetch(`/api/editor-picks/${id}`, { method:'DELETE' });
    if (response.ok) location.reload(); else { status='Could not remove this pick.'; busy=false; }
  }
  async function move(id:string, delta:number) {
    const ordered=[...picks].sort((a,b)=>a.sortOrder-b.sortOrder);
    const index=ordered.findIndex((item)=>item.id===id); const next=index+delta;
    if(index<0||next<0||next>=ordered.length)return;
    [ordered[index],ordered[next]]=[ordered[next],ordered[index]];
    busy=true;
    const response=await fetch('/api/editor-picks/reorder',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:ordered.map((item)=>item.id)})});
    if(response.ok)location.reload();else{status='Could not reorder picks.';busy=false;}
  }
</script>
<section class="manager" aria-labelledby="editor-manager-title">
  <header><p class="eyebrow-global">Owner editorial tools</p><h1 id="editor-manager-title">Editor's Picks.</h1><p>Public recommendations are your editorial voice. Places Team roles cannot modify them.</p></header>
  {#if status}<p class="status" role="status">{status}</p>{/if}
  <div class="layout">
    <section class="list panel"><div class="heading"><h2>Current picks</h2><button type="button" onclick={()=>loadPick('')}>New pick</button></div>{#each [...picks].sort((a,b)=>a.sortOrder-b.sortOrder) as pick,index (pick.id)}<article class:selected={pick.id===selectedId}><div><span>{pick.published?'Published':'Draft'} · {String(index+1).padStart(2,'0')}</span><strong>{placeName(pick.placeId)}</strong><p>{pick.tagline}</p></div><div class="row-actions"><button type="button" onclick={()=>loadPick(pick.id)}>Edit</button><button type="button" aria-label={`Move ${placeName(pick.placeId)} up`} disabled={index===0||busy} onclick={()=>move(pick.id,-1)}>↑</button><button type="button" aria-label={`Move ${placeName(pick.placeId)} down`} disabled={index===picks.length-1||busy} onclick={()=>move(pick.id,1)}>↓</button><button class="danger" type="button" disabled={busy} onclick={()=>remove(pick.id)}>Remove</button></div></article>{:else}<p class="empty">No Editor's Picks yet.</p>{/each}</section>
    <section class="form panel"><h2>{selectedId?'Edit pick':'Add pick'}</h2><label>Place<select bind:value={placeId}><option value="">Choose a place</option>{#each availablePlaces as place}<option value={place.id}>{place.name}</option>{/each}</select></label><label>Tagline<input bind:value={tagline} maxlength="120" placeholder="Proper meal when you’ve got time." /></label><label>Editorial note<textarea bind:value={editorNote} maxlength="700" rows="6" placeholder="Why I personally recommend this place…"></textarea></label><fieldset><legend>Recommendation tags</legend><div class="chips">{#each EDITOR_PICK_TAGS as tag}<button type="button" class:active={reasonTags.includes(tag)} aria-pressed={reasonTags.includes(tag)} onclick={()=>toggleTag(tag)}>{EDITOR_PICK_TAG_LABELS[tag]}</button>{/each}</div></fieldset><label class="publish"><input type="checkbox" bind:checked={published}/> Publish now</label><div class="form-actions"><button class="primary" type="button" disabled={busy} onclick={save}>{busy?'Saving…':selectedId?'Save changes':'Add pick'}</button>{#if selectedId}<button type="button" onclick={()=>loadPick('')}>Cancel</button>{/if}</div></section>
  </div>
</section>
<style>.manager{width:var(--page-wide);margin:0 auto;padding:clamp(2rem,6vw,5rem) 0 6rem}.manager>header{max-width:56rem}.manager h1{margin:var(--space-3) 0;color:var(--brand-maroon-deep);font:820 clamp(2.8rem,9vw,5.2rem)/.9 var(--font-display);letter-spacing:-.05em}.manager>header>p:last-child{color:var(--color-text-muted);line-height:1.55}.status{padding:var(--space-3);border-radius:var(--radius-sm);background:rgb(92 16 22/.08);color:var(--brand-maroon-deep)}.layout{display:grid;gap:var(--space-5);margin-top:var(--space-7)}.panel{padding:var(--space-5);border:1px solid var(--color-border);border-radius:var(--radius-xl);background:var(--brand-cream)}.heading{display:flex;justify-content:space-between;align-items:center;gap:var(--space-3)}h2{margin:0;color:var(--brand-maroon-deep);font:780 1.7rem/1 var(--font-display)}article{display:grid;gap:var(--space-3);padding:var(--space-3);border-top:1px solid var(--color-border)}article.selected{background:var(--brand-sand);border-radius:var(--radius-sm)}article>div:first-child{display:grid;gap:.25rem}article span,.empty{color:var(--color-text-muted);font-size:.75rem}article p{margin:0;color:var(--color-text-muted)}button{min-height:2.65rem;padding:0 .8rem;border:1px solid var(--brand-maroon-deep);border-radius:999px;background:transparent;color:var(--brand-maroon-deep);font-weight:720;cursor:pointer}button.primary,.heading button{background:var(--brand-maroon-deep);color:var(--brand-cream)}button.danger{border-color:rgb(92 16 22/.3)}button:disabled{opacity:.45;cursor:not-allowed}.row-actions{display:flex;flex-wrap:wrap;gap:.35rem}.form{display:grid;gap:var(--space-4)}label,fieldset{display:grid;gap:.4rem;color:var(--color-text-muted);font-size:.75rem;font-weight:720}input,select,textarea{width:100%;padding:.7rem var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-sm);background:#fff;color:var(--color-text);font:inherit}select,input{min-height:var(--tap-target)}textarea{resize:vertical}fieldset{margin:0;padding:0;border:0}.chips{display:flex;flex-wrap:wrap;gap:.4rem}.chips button.active{background:var(--brand-maroon-deep);color:var(--brand-cream)}label.publish{display:flex;grid-template-columns:auto 1fr;align-items:center;gap:.6rem}label.publish input{width:1.15rem;min-height:auto}.form-actions{display:flex;gap:var(--space-2)}@media(min-width:980px){.layout{grid-template-columns:minmax(0,1.05fr) minmax(20rem,.95fr);align-items:start}.form{position:sticky;top:1rem}}</style>
