import { describe, expect, it } from 'vitest';
import type { Anchor, Place } from '../../src/lib/types';
import {
  emptyPersonalState,
  nextClass,
  normalizePersonalState,
  routeHref,
} from '../../src/lib/personal-state';
import { ageInDays } from '../../src/lib/freshness';
import { buildOpsDashboard } from '../../src/lib/ops-dashboard';
import { validatePlaceAudit } from '../../src/lib/place-audit';
import { validatePlaceFeedback } from '../../src/lib/place-feedback';

function place(overrides: Partial<Place> & Pick<Place, 'id' | 'name'>): Place {
  return {
    id: overrides.id,
    name: overrides.name,
    lat: 14.165,
    lon: 121.24,
    category: 'restaurant',
    cuisine: [],
    phone: null,
    website: null,
    openingHours: null,
    recordStatus: 'candidate',
    sources: [],
    independentSourceCount: 1,
    overtureConfidence: null,
    operatingStatus: null,
    confidenceLabel: 'Limited place information',
    hasParseableHours: false,
    aliases: [],
    addedAt: null,
    lastReviewedAt: null,
    price: null,
    mealTags: [],
    dishes: [],
    ...overrides,
  };
}

const anchors: Anchor[] = [
  { id: 'ics', name: 'ICS', lat: 14.165, lon: 121.24 },
  { id: 'math', name: 'Math', lat: 14.166, lon: 121.241 },
];

describe('personal state', () => {
  it('rejects unknown state versions and invalid/overnight class ranges', () => {
    expect(normalizePersonalState({ version: 2 }).timetable).toEqual([]);
    expect(normalizePersonalState({
      version: 1,
      timetable: [{ id: 'bad', day: 1, startTime: '11:00', endTime: '10:00', course: 'Bad', anchorId: 'ics' }],
      quickRoutes: [],
    }).timetable).toEqual([]);
  });

  it('calculates the next class using the Manila calendar even when the Date is UTC', () => {
    const state = emptyPersonalState();
    state.timetable.push({ id: 'class-a', day: 1, startTime: '10:00', endTime: '11:00', course: 'CMSC 150', anchorId: 'ics' });
    expect(nextClass(state, anchors, new Date('2026-08-17T01:30:00Z'))?.startsInMinutes).toBe(30);
    expect(nextClass(state, anchors, new Date('2026-08-17T03:30:00Z'))?.startsInMinutes).toBe(9990);
  });

  it('normalizes quick routes and rounds break minutes to 5-minute increments', () => {
    const normalized = normalizePersonalState({
      version: 1,
      timetable: [],
      quickRoutes: [{
        id: 'route-1',
        name: '  Quick route  ',
        originId: 'ics',
        destinationId: 'math',
        breakMinutes: 44,
        createdAt: '2026-08-18T00:00:00.000Z',
      }],
    });
    expect(normalized.quickRoutes[0].breakMinutes).toBe(45);
    expect(routeHref(normalized.quickRoutes[0])).toBe('/picks?origin=ics&originMode=building&break=45&destination=math');
  });
});

describe('roulette and freshness', () => {
  it('counts date-only freshness using Asia/Manila day boundaries', () => {
    expect(ageInDays('2026-08-18', new Date('2026-08-18T16:30:00Z'))).toBe(1);
  });
});

describe('Places Ops data contracts', () => {
  it('validates audit actions and rejects duplicate event ids', () => {
    expect(() => validatePlaceAudit({ version: 1, events: [{ id: 'x', placeId: 'p', field: 'hours', action: 'made_up', source: 'test', createdAt: '2026-08-18T00:00:00Z' }] })).toThrow();
    expect(() => validatePlaceAudit({ version: 1, events: [
      { id: 'x', placeId: 'p', field: 'hours', action: 'updated', source: 'test', createdAt: '2026-08-18T00:00:00Z' },
      { id: 'x', placeId: 'p', field: 'price', action: 'updated', source: 'test', createdAt: '2026-08-18T01:00:00Z' },
    ] })).toThrow(/duplicate/i);
  });

  it('validates privacy-safe aggregate feedback snapshots', () => {
    const parsed = validatePlaceFeedback({
      version: 1,
      generatedAt: '2026-08-18T00:00:00Z',
      rows: [{ placeId: 'p', openCount: 2, reviewingCount: 1, newestAt: '2026-08-18T01:00:00Z', categories: { hours_wrong: 2, closed: 1 } }],
    });
    expect(parsed.rows[0].openCount).toBe(2);
  });

  it('excludes closed records from the active health queue and scores health', () => {
    const reported = place({ id: 'reported', name: 'Reported', openingHours: 'Mo-Su 09:00-17:00', lastReviewedAt: '2026-08-17', mealTags: ['rice-meal'], dishes: [{ name: 'Meal' }], price: { mealLowPhp: 100, verifiedAt: '2026-08-17' } });
    const stale = place({ id: 'stale', name: 'Stale' });
    const closed = place({ id: 'closed', name: 'Closed', recordStatus: 'closed' });
    const feedback = [{ placeId: 'reported', openCount: 3, reviewingCount: 0, newestAt: '2026-08-18T00:00:00Z', categories: { hours_wrong: 3 } }];
    const dashboard = buildOpsDashboard([stale, closed, reported], new Date('2026-08-18T12:00:00Z'), feedback);
    expect(dashboard.totals.places).toBe(2);
    expect(dashboard.totals.openReports).toBe(3);
    expect(dashboard.tasks[0].placeId).toBe('reported');
  });
});
