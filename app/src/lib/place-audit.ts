export type AuditAction = 'created' | 'updated' | 'verified' | 'shop_verified' | 'closed' | 'reopened';
export interface PlaceAuditEvent {
  id: string;
  placeId: string;
  placeName?: string;
  field: string;
  action: AuditAction;
  before?: unknown;
  after?: unknown;
  source: string;
  reason?: string;
  createdAt: string;
}
export interface PlaceAuditData { version: 1; events: PlaceAuditEvent[]; }

const ACTIONS = new Set<AuditAction>(['created', 'updated', 'verified', 'shop_verified', 'closed', 'reopened']);
function text(value: unknown, max = 240): string | undefined {
  if (typeof value !== 'string') return undefined;
  const clean = value.trim().replace(/\s+/g, ' ');
  return clean ? clean.slice(0, max) : undefined;
}

export function validatePlaceAudit(value: unknown): PlaceAuditData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('place_audit.json must be an object');
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 || !Array.isArray(raw.events)) throw new Error('place_audit.json must use version 1 and contain events');
  const seen = new Set<string>();
  const events = raw.events.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`place_audit.json event ${index} is invalid`);
    const row = item as Record<string, unknown>;
    const id = text(row.id, 128);
    const placeId = text(row.placeId, 128);
    const field = text(row.field, 120);
    const source = text(row.source, 120);
    if (!id || !placeId || !field || !source) throw new Error(`place_audit.json event ${index} is missing a required field`);
    if (seen.has(id)) throw new Error(`place_audit.json contains duplicate event id ${id}`);
    seen.add(id);
    if (typeof row.action !== 'string' || !ACTIONS.has(row.action as AuditAction)) throw new Error(`place_audit.json event ${index} has invalid action`);
    const date = new Date(String(row.createdAt ?? ''));
    if (!Number.isFinite(date.getTime())) throw new Error(`place_audit.json event ${index} has invalid createdAt`);
    const placeName = text(row.placeName, 160);
    const reason = text(row.reason, 500);
    return {
      id,
      placeId,
      ...(placeName ? { placeName } : {}),
      field,
      action: row.action as AuditAction,
      ...(row.before === undefined ? {} : { before: row.before }),
      ...(row.after === undefined ? {} : { after: row.after }),
      source,
      ...(reason ? { reason } : {}),
      createdAt: date.toISOString(),
    };
  });
  return { version: 1, events };
}
