import type { Place } from './types';
import { ageInDays } from './freshness';
import { feedbackCategoryLabel, type PlaceFeedbackSummary } from './place-feedback';

export interface OpsTask {
  placeId: string;
  placeName: string;
  priority: number;
  reasons: string[];
  openReports: number;
}

export interface OpsDashboard {
  generatedAt: string;
  totals: {
    places: number;
    stale: number;
    missingHours: number;
    missingPrice: number;
    missingMealTags: number;
    missingDishes: number;
    verifiedShops: number;
    openReports: number;
  };
  tasks: OpsTask[];
}

export function buildOpsDashboard(places: Place[], now = new Date(), feedbackRows: PlaceFeedbackSummary[] = []): OpsDashboard {
  const activePlaces = places.filter((place) => place.recordStatus === 'candidate');
  const feedbackByPlace = new Map(feedbackRows.map((row) => [row.placeId, row]));
  const tasks: OpsTask[] = [];
  let stale = 0, missingHours = 0, missingPrice = 0, missingMealTags = 0, missingDishes = 0, verifiedShops = 0, openReports = 0;

  for (const place of activePlaces) {
    const reasons: string[] = [];
    let priority = 0;
    const feedback = feedbackByPlace.get(place.id);
    const reportCount = (feedback?.openCount ?? 0) + (feedback?.reviewingCount ?? 0);
    openReports += reportCount;
    if (reportCount > 0 && feedback) {
      priority += Math.min(120, reportCount * 30);
      const details = Object.entries(feedback.categories)
        .filter((entry): entry is [keyof typeof feedback.categories, number] => Number(entry[1]) > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category, count]) => `${feedbackCategoryLabel(category)} ×${count}`);
      reasons.push(`${reportCount} community report${reportCount === 1 ? '' : 's'}${details.length ? `: ${details.join(', ')}` : ''}`);
    }

    const age = ageInDays(place.lastReviewedAt, now);
    if (age === undefined || age > 90) {
      stale += 1;
      priority += age === undefined ? 30 : Math.min(50, 20 + Math.floor(age / 30) * 5);
      reasons.push(age === undefined ? 'Never community-reviewed' : `Review is ${age} days old`);
    }
    if (!place.openingHours) { missingHours += 1; priority += 18; reasons.push('Missing hours'); }
    if (!place.price) { missingPrice += 1; priority += 12; reasons.push('Missing meal price'); }
    if (!place.mealTags?.length) { missingMealTags += 1; priority += 8; reasons.push('Missing meal tags'); }
    if (!place.dishes?.length) { missingDishes += 1; priority += 6; reasons.push('No dish highlights'); }
    if (place.shopVerification?.status === 'verified') verifiedShops += 1;
    if (reasons.length) tasks.push({ placeId: place.id, placeName: place.name, priority, reasons, openReports: reportCount });
  }

  tasks.sort((a, b) => b.priority - a.priority || b.openReports - a.openReports || a.placeName.localeCompare(b.placeName));
  return {
    generatedAt: now.toISOString(),
    totals: { places: activePlaces.length, stale, missingHours, missingPrice, missingMealTags, missingDishes, verifiedShops, openReports },
    tasks: tasks.slice(0, 250),
  };
}
