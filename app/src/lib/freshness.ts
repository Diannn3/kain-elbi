import type { Place } from './types';

export type FreshnessTone = 'fresh' | 'aging' | 'stale' | 'unknown';

function manilaDateEpoch(now: Date): number | undefined {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return undefined;
  return Date.UTC(year, month - 1, day);
}

export function ageInDays(isoDate: string | null | undefined, now = new Date()): number | undefined {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate.slice(0, 10))) return undefined;
  const source = Date.parse(`${isoDate.slice(0, 10)}T00:00:00Z`);
  const today = manilaDateEpoch(now);
  if (!Number.isFinite(source) || today === undefined) return undefined;
  return Math.max(0, Math.floor((today - source) / 86_400_000));
}

export function freshnessTone(isoDate: string | null | undefined, now = new Date()): FreshnessTone {
  const age = ageInDays(isoDate, now);
  if (age === undefined) return 'unknown';
  if (age <= 30) return 'fresh';
  if (age <= 90) return 'aging';
  return 'stale';
}

export function freshnessLabel(isoDate: string | null | undefined, now = new Date()): string {
  const age = ageInDays(isoDate, now);
  if (age === undefined) return 'Not yet verified';
  if (age === 0) return 'Verified today';
  if (age === 1) return 'Verified yesterday';
  return `Verified ${age} days ago`;
}

export function placeFreshnessDate(place: Place): string | undefined {
  const dates = [
    place.lastReviewedAt,
    place.price?.verifiedAt,
  ].filter((value): value is string => Boolean(value));
  return dates.sort().at(-1);
}
