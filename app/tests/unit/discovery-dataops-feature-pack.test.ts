import { describe, expect, it } from 'vitest';
import type { Anchor } from '../../src/lib/types';
import {
  emptyPersonalState,
  nextClass,
  normalizePersonalState,
  routeHref,
} from '../../src/lib/personal-state';

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
