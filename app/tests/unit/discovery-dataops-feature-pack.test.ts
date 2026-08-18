import { describe, expect, it } from 'vitest';
import type { Anchor, Place } from '../../src/lib/types';
import {
  emptyPersonalState,
  nextClass,
  normalizePersonalState,
  routeHref,
} from '../../src/lib/personal-state';
import {
  matchesMealTags,
  parseNaturalFoodQuery,
  placeFitsNaturalBudget,
  removeBudgetIntent,
  removeMealTypeIntent,
  removeOpenNowIntent,
} from '../../src/lib/natural-food-search';
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

  it('normalizes reco lists and guarantees the default my-recos list', () => {
    const normalized = normalizePersonalState({
      version: 1,
      timetable: [],
      quickRoutes: [],
      recoLists: [
        { id: 'custom', name: '  Study Spots  ', placeIds: ['place-1', 'place-1', 'invalid id!'], updatedAt: '2026-08-18T00:00:00.000Z' },
      ],
    });
    expect(normalized.recoLists[0].id).toBe('my-recos');
    expect(normalized.recoLists.find((list) => list.id === 'custom')?.placeIds).toEqual(['place-1']);
    expect(normalized.recoLists.some((list) => list.id === 'my-recos')).toBe(true);
  });
});

describe('deterministic natural food search', () => {
  it('parses compound intent and makes plain quick an actual quick-meal constraint', () => {
    const intent = parseNaturalFoodQuery('sisig under 120 quick open now');
    expect(intent.textQuery).toBe('sisig');
    expect(intent.maxBudget).toBe(120);
    expect(intent.quick).toBe(true);
    expect(intent.mealTags).toContain('quick-meal');
    expect(intent.openNow).toBe(true);
  });

  it('uses word boundaries instead of substring accidents', () => {
    expect(parseNaturalFoodQuery('breakfast').quick).toBe(false);
    expect(parseNaturalFoodQuery('cafeteria').category).toBeUndefined();
    expect(parseNaturalFoodQuery('pancake').mealTags).not.toContain('dessert');
  });

  it('removes one intent without erasing unrelated constraints', () => {
    expect(removeBudgetIntent('sisig under 120 quick')).toBe('sisig quick');
    expect(removeMealTypeIntent('sisig under 120 quick')).toBe('sisig under 120');
    expect(removeOpenNowIntent('sisig under 120 open now')).toBe('sisig under 120');
  });

  it('applies a dish-specific natural budget when the searched dish is known', () => {
    const expensiveSisig = place({
      id: 'sisig', name: 'Sisig Place', price: { mealLowPhp: 90, verifiedAt: '2026-08-18' },
      dishes: [{ name: 'Sisig', pricePhp: 180, verifiedAt: '2026-08-18' }],
    });
    const intent = parseNaturalFoodQuery('sisig under 120');
    expect(placeFitsNaturalBudget(expensiveSisig, intent)).toBe(false);
    expect(placeFitsNaturalBudget({ ...expensiveSisig, dishes: [{ name: 'Sisig', pricePhp: 110 }] }, intent)).toBe(true);
  });

  it('combines inferred and explicit meal-tag semantics', () => {
    const cafe = place({ id: 'cafe', name: 'Cafe', category: 'cafe', mealTags: ['quick-meal'] });
    expect(matchesMealTags(cafe, ['coffee', 'quick-meal'])).toBe(true);
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
