import { describe, expect, it } from 'vitest';
import { canEditPlaces, canViewPlacesOps, isOwnerRole, isStaffRole } from '../../src/lib/auth/authorization';
import { EDITOR_PICK_TAGS, mapEditorPickRow, parseEditorPickMutation } from '../../src/lib/editor-picks';
import { migrateLegacyPersonalState, normalizePersonalState } from '../../src/lib/personal-state';
import { mapOpsFeedbackRows, summarizeOpenFeedback } from '../../src/lib/ops-server';

describe('staff authorization primitives', () => {
  it('keeps editorial ownership separate from Places roles', () => {
    expect(isStaffRole('owner')).toBe(true);
    expect(canViewPlacesOps('places_viewer')).toBe(true);
    expect(canEditPlaces('places_viewer')).toBe(false);
    expect(canEditPlaces('places_editor')).toBe(true);
    expect(isOwnerRole('places_editor')).toBe(false);
    expect(isOwnerRole('owner')).toBe(true);
  });
});

describe('Editor Picks validation', () => {
  it('accepts controlled tags and rejects unknown tags', () => {
    const ok = parseEditorPickMutation({
      placeId: 'seoul-kitchen',
      tagline: 'Worth the walk.',
      editorNote: 'A personal recommendation.',
      reasonTags: ['worth-the-walk', 'with-friends'],
      published: true,
    });
    expect(ok?.reasonTags).toEqual(['worth-the-walk', 'with-friends']);
    expect(parseEditorPickMutation({ placeId:'x', tagline:'x', editorNote:'x', reasonTags:['sponsored'] })).toBeUndefined();
    expect(EDITOR_PICK_TAGS).not.toContain('sponsored' as never);
  });

  it('maps only structurally valid rows', () => {
    expect(mapEditorPickRow({
      id:'30000000-0000-0000-0000-000000000001', place_id:'foo', tagline:'t', editor_note:'n',
      reason_tags:['sulit'], sort_order:0, published:true,
      created_at:'2026-08-18T00:00:00Z', updated_at:'2026-08-18T00:00:00Z',
    })?.placeId).toBe('foo');
    expect(mapEditorPickRow({ id:'bad' })).toBeUndefined();
  });
});

describe('personal-state migration', () => {
  it('preserves timetable/routes/journal while removing live reco lists', () => {
    const v1 = {
      version:1,
      timetable:[{ id:'class-1', day:2, startTime:'10:00', endTime:'11:00', course:'MATH 28', anchorId:'math' }],
      quickRoutes:[{ id:'route-1', name:'Lunch', originId:'math', breakMinutes:45, createdAt:'2026-08-18T00:00:00Z' }],
      recoLists:[{ id:'my-recos', name:'My Recos', placeIds:['foo'], updatedAt:'2026-08-18T00:00:00Z' }],
      journal:[{ id:'meal-1', placeId:'foo', placeName:'Foo', eatenAt:'2026-08-18T00:00:00Z' }],
    };
    const migrated = migrateLegacyPersonalState(v1);
    expect(migrated.state.version).toBe(2);
    expect(migrated.state.timetable).toHaveLength(1);
    expect(migrated.state.quickRoutes).toHaveLength(1);
    expect(migrated.state.journal).toHaveLength(1);
    expect('recoLists' in migrated.state).toBe(false);
    expect(migrated.archive?.lists[0]?.placeIds).toEqual(['foo']);
    expect(normalizePersonalState(migrated.state)).toEqual(migrated.state);
  });
});

describe('private Ops mapping', () => {
  it('aggregates only open/reviewing feedback and never needs raw dedupe tokens', () => {
    const rows = mapOpsFeedbackRows([
      { id:'1', place_id:'foo', category:'hours_wrong', event_day:'2026-08-18', status:'open', created_at:'2026-08-18T00:00:00Z' },
      { id:'2', place_id:'foo', category:'closed', event_day:'2026-08-18', status:'reviewing', created_at:'2026-08-18T01:00:00Z' },
      { id:'3', place_id:'foo', category:'other', event_day:'2026-08-18', status:'resolved', created_at:'2026-08-18T02:00:00Z', dedupe_token:'must-be-ignored' },
    ]);
    expect(rows[0]).not.toHaveProperty('dedupeToken');
    expect(summarizeOpenFeedback(rows)).toEqual([expect.objectContaining({ placeId:'foo', openCount:1, reviewingCount:1 })]);
  });
});
