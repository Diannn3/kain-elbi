import rawResearchQueue from '../generated/private/research-queue.json';

export type ResearchRecommendation =
  | 'conflict_review'
  | 'needs_corroboration'
  | 'ready_for_review'
  | 'manual_review'
  | 'needs_more_evidence'
  | 'evidence_only'
  | 'no_change';

export interface ResearchOpsProposal {
  value: unknown;
  confidence: number;
  independentSources: number;
  freshest: string;
  sourceUrls: string[];
}

export interface ResearchOpsItem {
  id: string;
  placeId: string;
  placeName: string;
  field: string;
  currentValue: unknown;
  proposals: ResearchOpsProposal[];
  recommendation: ResearchRecommendation;
  risk: 'normal' | 'high';
  reasons: string[];
}

export interface ResearchOpsQueue {
  generatedAt?: string;
  candidatesPending: number;
  danglingClaims: number;
  counts: Record<string, number>;
  items: ResearchOpsItem[];
}

const RECOMMENDATIONS = new Set<ResearchRecommendation>([
  'conflict_review', 'needs_corroboration', 'ready_for_review', 'manual_review', 'needs_more_evidence', 'evidence_only', 'no_change',
]);

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function strings(value: unknown, max = 12): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, max) : [];
}

export function normalizeResearchOpsQueue(value: unknown): ResearchOpsQueue {
  const root = record(value);
  if (!root || root.schema_version !== 1) return { candidatesPending: 0, danglingClaims: 0, counts: {}, items: [] };
  const rawCounts = record(root.counts) ?? {};
  const counts = Object.fromEntries(Object.entries(rawCounts).flatMap(([key, raw]) => {
    const number = Number(raw);
    return Number.isInteger(number) && number >= 0 ? [[key, number]] : [];
  }));
  const items = (Array.isArray(root.items) ? root.items : []).flatMap((raw) => {
    const item = record(raw);
    if (!item) return [];
    const id = typeof item.id === 'string' ? item.id : '';
    const placeId = typeof item.place_id === 'string' ? item.place_id : '';
    const placeName = typeof item.place_name === 'string' ? item.place_name : '';
    const field = typeof item.field === 'string' ? item.field : '';
    const recommendation = typeof item.recommendation === 'string' && RECOMMENDATIONS.has(item.recommendation as ResearchRecommendation)
      ? item.recommendation as ResearchRecommendation
      : 'manual_review';
    if (!id || !placeId || !placeName || !field) return [];
    const proposals = (Array.isArray(item.proposals) ? item.proposals : []).flatMap((rawProposal) => {
      const proposal = record(rawProposal);
      if (!proposal) return [];
      const confidence = Number(proposal.confidence);
      const independentSources = Number(proposal.independent_sources);
      return [{
        value: proposal.value,
        confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
        independentSources: Number.isInteger(independentSources) && independentSources >= 0 ? independentSources : 0,
        freshest: typeof proposal.freshest === 'string' ? proposal.freshest : 'unknown',
        sourceUrls: strings(proposal.source_urls),
      }];
    });
    return [{
      id,
      placeId,
      placeName,
      field,
      currentValue: item.current_value,
      proposals,
      recommendation,
      risk: item.risk === 'high' ? 'high' as const : 'normal' as const,
      reasons: strings(item.reasons, 6),
    }];
  });
  return {
    ...(typeof root.generated_at === 'string' && root.generated_at ? { generatedAt: root.generated_at } : {}),
    candidatesPending: Math.max(0, Number(root.candidates_pending) || 0),
    danglingClaims: Math.max(0, Number(root.dangling_claims) || 0),
    counts,
    items,
  };
}

export function loadResearchOpsQueue(): ResearchOpsQueue {
  return normalizeResearchOpsQueue(rawResearchQueue);
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  return `"${String(raw).replaceAll('"', '""')}"`;
}

export function researchQueueToCsv(queue: ResearchOpsQueue): string {
  const headers = [
    'queue_id', 'place_id', 'place_name', 'field', 'current_value', 'proposed_value', 'selected_value',
    'recommendation', 'risk', 'confidence', 'independent_sources', 'freshest', 'source_urls',
    'decision', 'reviewer', 'review_notes',
  ];
  const lines = [headers.map(csvCell).join(',')];
  for (const item of queue.items) {
    const best = item.proposals[0];
    const proposed = item.proposals.length === 1 ? best?.value : item.proposals.map((proposal) => proposal.value);
    const selected = item.proposals.length === 1 ? best?.value : undefined;
    lines.push([
      item.id, item.placeId, item.placeName, item.field, item.currentValue, proposed, selected,
      item.recommendation, item.risk, best?.confidence, best?.independentSources, best?.freshest,
      best?.sourceUrls.join(' | ') ?? '', '', '', '',
    ].map(csvCell).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
