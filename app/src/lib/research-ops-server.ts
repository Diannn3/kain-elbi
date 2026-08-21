import rawResearchExportQueue from '../generated/private/research-queue-export.json';
import { normalizeResearchOpsQueue, researchQueueToCsv } from './research-ops';

/** Server-only full sanitized review export. Never pass this object to a hydrated island. */
export function loadResearchOpsExportCsv(): string {
  return researchQueueToCsv(normalizeResearchOpsQueue(rawResearchExportQueue));
}
