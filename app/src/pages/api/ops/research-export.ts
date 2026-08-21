import type { APIRoute } from 'astro';
import { getStaffContext } from '../../../lib/auth/guards';
import { setPrivateNoStore } from '../../../lib/auth/server';
import { loadResearchOpsQueue, researchQueueToCsv } from '../../../lib/research-ops';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  const { identity } = await getStaffContext(request, cookies);
  if (!identity) return new Response('Forbidden', { status: 403 });
  const headers = new Headers({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="uppetite-research-review.csv"',
    'X-Content-Type-Options': 'nosniff',
  });
  setPrivateNoStore(headers);
  return new Response(researchQueueToCsv(loadResearchOpsQueue()), { headers });
};
