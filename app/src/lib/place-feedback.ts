export type PlaceFeedbackCategory = 'hours_wrong' | 'price_menu_wrong' | 'location_wrong' | 'closed' | 'duplicate' | 'other';

export interface PlaceFeedbackSummary {
  placeId: string;
  openCount: number;
  reviewingCount: number;
  newestAt: string;
  categories: Partial<Record<PlaceFeedbackCategory, number>>;
}

export interface PlaceFeedbackData {
  version: 1;
  generatedAt: string | null;
  rows: PlaceFeedbackSummary[];
}

const CATEGORIES = new Set<PlaceFeedbackCategory>(['hours_wrong', 'price_menu_wrong', 'location_wrong', 'closed', 'duplicate', 'other']);
const PLACE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;

export function validatePlaceFeedback(value: unknown): PlaceFeedbackData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('place_feedback.json must be an object');
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 || !Array.isArray(raw.rows)) throw new Error('place_feedback.json must use version 1 and contain rows');
  const generatedAt = raw.generatedAt === null ? null : new Date(String(raw.generatedAt ?? ''));
  if (generatedAt !== null && !Number.isFinite(generatedAt.getTime())) throw new Error('place_feedback.json generatedAt is invalid');
  const seen = new Set<string>();
  const rows = raw.rows.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`place_feedback.json row ${index} is invalid`);
    const row = item as Record<string, unknown>;
    const placeId = typeof row.placeId === 'string' ? row.placeId.trim() : '';
    if (!PLACE_ID.test(placeId) || seen.has(placeId)) throw new Error(`place_feedback.json row ${index} has invalid or duplicate placeId`);
    seen.add(placeId);
    const openCount = Number(row.openCount);
    const reviewingCount = Number(row.reviewingCount);
    if (!Number.isInteger(openCount) || openCount < 0 || !Number.isInteger(reviewingCount) || reviewingCount < 0) throw new Error(`place_feedback.json ${placeId} has invalid counts`);
    const newestAt = new Date(String(row.newestAt ?? ''));
    if (!Number.isFinite(newestAt.getTime())) throw new Error(`place_feedback.json ${placeId} newestAt is invalid`);
    if (!row.categories || typeof row.categories !== 'object' || Array.isArray(row.categories)) throw new Error(`place_feedback.json ${placeId} categories is invalid`);
    const categories: Partial<Record<PlaceFeedbackCategory, number>> = {};
    for (const [key, count] of Object.entries(row.categories as Record<string, unknown>)) {
      if (!CATEGORIES.has(key as PlaceFeedbackCategory)) throw new Error(`place_feedback.json ${placeId} has invalid category ${key}`);
      const parsed = Number(count);
      if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`place_feedback.json ${placeId} category ${key} has invalid count`);
      if (parsed > 0) categories[key as PlaceFeedbackCategory] = parsed;
    }
    const categoryTotal = Object.values(categories).reduce((sum, count) => sum + (count ?? 0), 0);
    if (categoryTotal !== openCount + reviewingCount) {
      throw new Error(`place_feedback.json ${placeId} category counts must equal openCount + reviewingCount`);
    }
    if (categoryTotal === 0) throw new Error(`place_feedback.json ${placeId} must contain at least one open/reviewing report`);
    return { placeId, openCount, reviewingCount, newestAt: newestAt.toISOString(), categories };
  });
  return { version: 1, generatedAt: generatedAt === null ? null : generatedAt.toISOString(), rows };
}

export function feedbackCategoryLabel(category: PlaceFeedbackCategory): string {
  return ({
    hours_wrong: 'Hours wrong',
    price_menu_wrong: 'Price/menu wrong',
    location_wrong: 'Location wrong',
    closed: 'Looks closed',
    duplicate: 'Possible duplicate',
    other: 'Other issue',
  })[category];
}
