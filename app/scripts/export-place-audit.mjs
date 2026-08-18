import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function firstDictionaryValue(raw) {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
    return parsed.default || Object.values(parsed).find((value) => typeof value === 'string');
  } catch {
    return undefined;
  }
}

const base = process.env.SUPABASE_URL?.trim().replace(/\/+$/, '');
const key = (
  process.env.SUPABASE_SECRET_KEY
  || firstDictionaryValue(process.env.SUPABASE_SECRET_KEYS)
  || process.env.SUPABASE_SERVICE_ROLE_KEY
)?.trim();

if (!base || !key) {
  throw new Error(
    'Set SUPABASE_URL plus SUPABASE_SECRET_KEY (preferred), SUPABASE_SECRET_KEYS, or legacy SUPABASE_SERVICE_ROLE_KEY. Never expose a server key to browser code.',
  );
}

const headers = { apikey: key };
// New sb_secret_ keys are opaque API keys, not JWTs. Legacy service_role keys are JWTs.
if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;

async function fetchPage(path) {
  const response = await fetch(`${base}${path}`, { headers });
  if (!response.ok) throw new Error(`Places Ops export failed (${response.status}): ${await response.text()}`);
  const value = await response.json();
  if (!Array.isArray(value)) throw new Error('Places Ops export returned a non-array payload.');
  return value;
}

async function fetchAll(path, { pageSize = 1000, maxRows = 10_000 } = {}) {
  const rows = [];
  for (let offset = 0; offset < maxRows; offset += pageSize) {
    const separator = path.includes('?') ? '&' : '?';
    const page = await fetchPage(`${path}${separator}limit=${pageSize}&offset=${offset}`);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
  throw new Error(`Places Ops export hit its ${maxRows}-row safety cap. Resolve/archive queue items or raise the cap deliberately.`);
}

const [auditRows, feedbackRows] = await Promise.all([
  fetchAll('/rest/v1/uppetite_place_audit_log?select=id,place_id,field_name,action,before_value,after_value,source,reason,created_at&order=created_at.desc', { maxRows: 5000 }),
  fetchAll('/rest/v1/uppetite_place_feedback?select=place_id,category,status,created_at&status=in.(open,reviewing)&order=created_at.desc', { maxRows: 10_000 }),
]);

const events = auditRows.map((row) => ({
  id: row.id,
  placeId: row.place_id,
  field: row.field_name,
  action: row.action,
  ...(row.before_value === null ? {} : { before: row.before_value }),
  ...(row.after_value === null ? {} : { after: row.after_value }),
  source: row.source,
  ...(row.reason ? { reason: row.reason } : {}),
  createdAt: row.created_at,
}));

const feedbackByPlace = new Map();
for (const row of feedbackRows) {
  if (typeof row.place_id !== 'string' || typeof row.category !== 'string' || typeof row.status !== 'string') continue;
  const created = new Date(row.created_at);
  if (!Number.isFinite(created.getTime())) continue;
  const current = feedbackByPlace.get(row.place_id) ?? {
    placeId: row.place_id,
    openCount: 0,
    reviewingCount: 0,
    newestAt: created.toISOString(),
    categories: {},
  };
  if (row.status === 'open') current.openCount += 1;
  if (row.status === 'reviewing') current.reviewingCount += 1;
  current.categories[row.category] = (current.categories[row.category] ?? 0) + 1;
  if (created.toISOString() > current.newestAt) current.newestAt = created.toISOString();
  feedbackByPlace.set(row.place_id, current);
}

const rootData = resolve(process.cwd(), '../data');
await mkdir(rootData, { recursive: true });
const auditDestination = resolve(rootData, 'place_audit.json');
const feedbackDestination = resolve(rootData, 'place_feedback.json');
await Promise.all([
  writeFile(auditDestination, JSON.stringify({ version: 1, events }, null, 2) + '\n'),
  writeFile(feedbackDestination, JSON.stringify({
    version: 1,
    generatedAt: new Date().toISOString(),
    rows: [...feedbackByPlace.values()].sort((a, b) => (b.openCount + b.reviewingCount) - (a.openCount + a.reviewingCount)),
  }, null, 2) + '\n'),
]);

console.log(`Exported ${events.length} audit events to ${auditDestination}`);
console.log(`Exported ${feedbackRows.length} open/reviewing reports across ${feedbackByPlace.size} places to ${feedbackDestination}`);
