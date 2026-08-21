import { describe, expect, it } from 'vitest';
import { normalizeResearchOpsQueue, researchQueueToCsv } from '../../src/lib/research-ops';

describe('research ops private snapshot', () => {
  it('normalizes queue records and refuses unknown recommendation labels', () => {
    const queue = normalizeResearchOpsQueue({
      schema_version: 1,
      generated_at: '2026-08-21T10:00:00Z',
      candidates_pending: 2,
      dangling_claims: 0,
      counts: { ready_for_review: 1 },
      items: [{
        id: 'queue-1', place_id: 'place-1', place_name: 'Cafe', field: 'opening_hours',
        current_value: null, recommendation: 'weird', risk: 'high', reasons: ['Check'],
        proposals: [{ value: 'Mo-Su 08:00-20:00', confidence: 0.91, independent_sources: 1, freshest: 'fresh', source_urls: ['https://example.com'] }],
      }],
    });
    expect(queue.candidatesPending).toBe(2);
    expect(queue.items[0].recommendation).toBe('manual_review');
    expect(queue.items[0].risk).toBe('high');
  });

  it('preserves the evidence-only recommendation boundary', () => {
    const queue = normalizeResearchOpsQueue({
      schema_version: 1, candidates_pending: 0, dangling_claims: 0, counts: { evidence_only: 1 },
      items: [{ id: 'queue-evidence', place_id: 'place-1', place_name: 'Cafe', field: 'facebook_url',
        current_value: null, recommendation: 'evidence_only', risk: 'normal', reasons: ['No publication target'], proposals: [] }],
    });
    expect(queue.items[0].recommendation).toBe('evidence_only');
  });

  it('exports the exact review columns expected by the Python decision importer', () => {
    const queue = normalizeResearchOpsQueue({
      schema_version: 1,
      candidates_pending: 0,
      dangling_claims: 0,
      counts: {},
      items: [{
        id: 'queue-1', place_id: 'place-1', place_name: 'Cafe, Elbi', field: 'opening_hours',
        current_value: null, recommendation: 'ready_for_review', risk: 'normal', reasons: [],
        proposals: [{ value: 'Mo-Su 08:00-20:00', confidence: 0.91, independent_sources: 1, freshest: 'fresh', source_urls: ['https://example.com'] }],
      }],
    });
    const csv = researchQueueToCsv(queue);
    expect(csv).toContain('"queue_id","place_id","place_name"');
    expect(csv).toContain('"Cafe, Elbi"');
    expect(csv).toContain('"ready_for_review"');
    expect(csv).toContain('"decision","reviewer","review_notes"');
  });
  it('neutralizes spreadsheet formulas in CSV output', () => {
    const queue = normalizeResearchOpsQueue({
      schema_version: 1, candidates_pending: 0, dangling_claims: 0, counts: {},
      items: [{
        id: 'queue-formula', place_id: 'place-1', place_name: '=WEBSERVICE("https://evil.example")', field: 'name',
        current_value: 'Safe', recommendation: 'manual_review', risk: 'normal', reasons: [],
        proposals: [{ value: '=EVIL()', confidence: 0.9, independent_sources: 1, freshest: 'fresh', source_urls: [] }],
      }],
    });
    const csv = researchQueueToCsv(queue);
    expect(csv).toContain('"\t=WEBSERVICE(""https://evil.example"")"');
    expect(csv).toContain('"\t=EVIL()"');
  });

  it('drops unsafe or credential-bearing evidence URLs in the UI normalizer', () => {
    const queue = normalizeResearchOpsQueue({
      schema_version: 1, candidates_pending: 0, dangling_claims: 0, counts: {},
      items: [{
        id: 'queue-url', place_id: 'place-1', place_name: 'Cafe', field: 'opening_hours',
        current_value: null, recommendation: 'manual_review', risk: 'normal', reasons: [],
        proposals: [{
          value: 'Mo-Su 08:00-20:00', confidence: 0.8, independent_sources: 1, freshest: 'fresh',
          source_urls: ['javascript:alert(1)', 'https://user:pass@example.com/x', 'https://example.com/x?access_token=nope&utm_source=x&ok=1'],
        }],
      }],
    });
    expect(queue.items[0].proposals[0].sourceUrls).toEqual(['https://example.com/x?ok=1']);
  });

});
