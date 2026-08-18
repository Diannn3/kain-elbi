import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlaceAuditEvent, AuditAction } from './place-audit';
import type { PlaceFeedbackCategory, PlaceFeedbackSummary } from './place-feedback';

export interface OpsFeedbackRow {
  id: string;
  placeId: string;
  category: PlaceFeedbackCategory;
  eventDay: string;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedAt?: string;
}

const FEEDBACK_CATEGORIES = new Set<PlaceFeedbackCategory>([
  'hours_wrong', 'price_menu_wrong', 'location_wrong', 'closed', 'duplicate', 'other',
]);
const AUDIT_ACTIONS = new Set<AuditAction>(['created', 'updated', 'verified', 'shop_verified', 'closed', 'reopened']);

function safeDate(value: unknown): string | undefined {
  const date = new Date(String(value ?? ''));
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

export function mapOpsFeedbackRows(value: unknown): OpsFeedbackRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const id = typeof row.id === 'string' ? row.id : '';
    const placeId = typeof row.place_id === 'string' ? row.place_id : '';
    const category = row.category;
    const status = row.status;
    const createdAt = safeDate(row.created_at);
    const eventDay = typeof row.event_day === 'string' ? row.event_day : '';
    if (!id || !placeId || !FEEDBACK_CATEGORIES.has(category as PlaceFeedbackCategory)
      || !['open','reviewing','resolved','dismissed'].includes(String(status)) || !createdAt || !eventDay) return [];
    const resolvedAt = row.resolved_at == null ? undefined : safeDate(row.resolved_at);
    return [{
      id,
      placeId,
      category: category as PlaceFeedbackCategory,
      eventDay,
      status: status as OpsFeedbackRow['status'],
      createdAt,
      ...(resolvedAt ? { resolvedAt } : {}),
    }];
  });
}

export function summarizeOpenFeedback(rows: OpsFeedbackRow[]): PlaceFeedbackSummary[] {
  const grouped = new Map<string, PlaceFeedbackSummary>();
  for (const row of rows) {
    if (row.status !== 'open' && row.status !== 'reviewing') continue;
    const current = grouped.get(row.placeId) ?? {
      placeId: row.placeId,
      openCount: 0,
      reviewingCount: 0,
      newestAt: row.createdAt,
      categories: {},
    };
    if (row.status === 'open') current.openCount += 1;
    else current.reviewingCount += 1;
    current.categories[row.category] = (current.categories[row.category] ?? 0) + 1;
    if (row.createdAt > current.newestAt) current.newestAt = row.createdAt;
    grouped.set(row.placeId, current);
  }
  return Array.from(grouped.values());
}

export function mapOpsAuditRows(value: unknown, placeNames: Map<string, string>): PlaceAuditEvent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const id = typeof row.id === 'string' ? row.id : '';
    const placeId = typeof row.place_id === 'string' ? row.place_id : '';
    const field = typeof row.field_name === 'string' ? row.field_name : '';
    const action = row.action;
    const source = typeof row.source === 'string' ? row.source : '';
    const createdAt = safeDate(row.created_at);
    if (!id || !placeId || !field || !source || !AUDIT_ACTIONS.has(action as AuditAction) || !createdAt) return [];
    const reason = typeof row.reason === 'string' && row.reason.trim() ? row.reason.trim().slice(0, 500) : undefined;
    return [{
      id,
      placeId,
      ...(placeNames.get(placeId) ? { placeName: placeNames.get(placeId) } : {}),
      field,
      action: action as AuditAction,
      ...(row.before_value === null || row.before_value === undefined ? {} : { before: row.before_value }),
      ...(row.after_value === null || row.after_value === undefined ? {} : { after: row.after_value }),
      source,
      ...(reason ? { reason } : {}),
      createdAt,
    }];
  });
}

export async function loadLiveOpsData(supabase: SupabaseClient, placeNames: Map<string, string>): Promise<{
  feedbackRows: OpsFeedbackRow[];
  feedbackSummary: PlaceFeedbackSummary[];
  auditEvents: PlaceAuditEvent[];
}> {
  const [{ data: feedback, error: feedbackError }, { data: audit, error: auditError }] = await Promise.all([
    supabase.rpc('get_uppetite_ops_feedback'),
    supabase.rpc('get_uppetite_ops_audit'),
  ]);
  if (feedbackError) throw feedbackError;
  if (auditError) throw auditError;
  const feedbackRows = mapOpsFeedbackRows(feedback);
  return {
    feedbackRows,
    feedbackSummary: summarizeOpenFeedback(feedbackRows),
    auditEvents: mapOpsAuditRows(audit, placeNames),
  };
}
