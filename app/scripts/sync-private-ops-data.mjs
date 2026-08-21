import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(appRoot, '..', 'data', 'reports', 'research_review_queue.json');
const output = resolve(appRoot, 'src', 'generated', 'private', 'research-queue.json');

function compactString(value, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function safeHttpUrl(value) {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function safeJsonValue(value, depth = 0) {
  if (depth > 4) return null;
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return value.slice(0, 500);
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => safeJsonValue(item, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, 30).map(([key, item]) => [compactString(key, 80), safeJsonValue(item, depth + 1)]));
  }
  return null;
}

function safeProposal(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const sourceUrls = Array.isArray(raw.source_urls)
    ? raw.source_urls.map(safeHttpUrl).filter(Boolean).slice(0, 12)
    : [];
  const confidence = Number(raw.confidence);
  const independentSources = Number(raw.independent_sources);
  return {
    value: safeJsonValue(raw.value),
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
    independent_sources: Number.isInteger(independentSources) && independentSources >= 0 ? independentSources : 0,
    freshest: compactString(raw.freshest, 40) || 'unknown',
    source_urls: sourceUrls,
  };
}

function sanitizeQueue(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('research review queue must be an object');
  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const items = rawItems.slice(0, 250).flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const id = compactString(item.id, 100);
    const placeId = compactString(item.place_id, 100);
    const placeName = compactString(item.place_name, 180);
    const field = compactString(item.field, 100);
    if (!id || !placeId || !placeName || !field) return [];
    const proposals = (Array.isArray(item.proposals) ? item.proposals : []).map(safeProposal).filter(Boolean).slice(0, 8);
    return [{
      id,
      place_id: placeId,
      place_name: placeName,
      field,
      current_value: safeJsonValue(item.current_value),
      proposals,
      recommendation: compactString(item.recommendation, 60) || 'manual_review',
      risk: item.risk === 'high' ? 'high' : 'normal',
      reasons: (Array.isArray(item.reasons) ? item.reasons : []).map((reason) => compactString(reason, 240)).filter(Boolean).slice(0, 6),
    }];
  });
  const counts = raw.counts && typeof raw.counts === 'object' && !Array.isArray(raw.counts)
    ? Object.fromEntries(Object.entries(raw.counts).flatMap(([key, value]) => Number.isInteger(Number(value)) && Number(value) >= 0 ? [[compactString(key, 60), Number(value)]] : []))
    : {};
  return {
    _private_kind: 'uppetite-research-ops-v1',
    schema_version: 1,
    generated_at: typeof raw.generated_at === 'string' ? raw.generated_at : null,
    candidates_pending: Math.max(0, Number(raw.candidates_pending) || 0),
    dangling_claims: Array.isArray(raw.dangling_claims) ? raw.dangling_claims.length : 0,
    counts,
    items,
  };
}

let snapshot = {
  _private_kind: 'uppetite-research-ops-v1',
  schema_version: 1,
  generated_at: null,
  candidates_pending: 0,
  dangling_claims: 0,
  counts: {},
  items: [],
};
if (existsSync(source)) {
  snapshot = sanitizeQueue(JSON.parse(await readFile(source, 'utf8')));
}
await mkdir(resolve(appRoot, 'src', 'generated', 'private'), { recursive: true });
await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
process.stdout.write(`synced private research ops snapshot (${snapshot.items.length} items)\n`);
