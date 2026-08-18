import type { Place } from './types';
import { ageInDays } from './freshness';

export type RouletteMode = 'surprise' | 'tipid' | 'quick' | 'explore' | 'safe';

function randomIndex(length: number, random = Math.random): number {
  if (length <= 1) return 0;
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function' && random === Math.random) {
    const values = new Uint32Array(1);
    const ceiling = Math.floor(0x1_0000_0000 / length) * length;
    do crypto.getRandomValues(values); while (values[0] >= ceiling);
    return values[0] % length;
  }
  const value = random();
  return Math.min(length - 1, Math.max(0, Math.floor(value * length)));
}

function modeCandidates(places: Place[], mode: RouletteMode): Place[] {
  if (mode === 'tipid') {
    const priced = places.filter((place) => Boolean(place.price?.mealLowPhp));
    return priced.length ? priced : places;
  }
  if (mode === 'quick') {
    const quick = places.filter((place) =>
      place.category === 'fast_food'
      || place.category === 'kiosk_stall'
      || place.mealTags?.includes('quick-meal'),
    );
    return quick.length ? quick : places;
  }
  return places;
}

function score(place: Place, mode: RouletteMode, saved: Set<string>, now: Date): number {
  switch (mode) {
    case 'tipid':
      return place.price?.mealLowPhp ? 5000 - place.price.mealLowPhp : -1000;
    case 'quick':
      return (place.category === 'fast_food' || place.category === 'kiosk_stall' ? 500 : 0)
        + (place.mealTags?.includes('quick-meal') ? 250 : 0);
    case 'explore': {
      const age = ageInDays(place.addedAt, now);
      const recency = age === undefined ? 0 : Math.max(0, 180 - age);
      return (saved.has(place.id) ? -500 : 250) + recency;
    }
    case 'safe': {
      const age = ageInDays(place.lastReviewedAt, now);
      const freshness = age === undefined ? -150 : Math.max(-100, 180 - age);
      return freshness
        + place.independentSourceCount * 20
        + (place.confidenceLabel === 'Multiple sources agree' ? 100 : 0)
        + (place.shopVerification?.status === 'verified' ? 50 : 0);
    }
    default:
      return 0;
  }
}

export function roulettePick(
  places: Place[],
  mode: RouletteMode,
  options: { saved?: Set<string>; random?: () => number; now?: Date } = {},
): Place | undefined {
  if (!places.length) return undefined;
  const candidates = modeCandidates(places, mode);
  if (mode === 'surprise') return candidates[randomIndex(candidates.length, options.random)];

  const saved = options.saved ?? new Set<string>();
  const now = options.now ?? new Date();
  const ranked = [...candidates].sort((a, b) =>
    score(b, mode, saved, now) - score(a, mode, saved, now)
    || a.name.localeCompare(b.name),
  );
  const poolSize = Math.max(1, Math.ceil(ranked.length * 0.25));
  return ranked[randomIndex(poolSize, options.random)];
}
