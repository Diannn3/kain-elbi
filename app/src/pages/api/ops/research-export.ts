import type { APIRoute } from 'astro';
import { getStaffContext } from '../../../lib/auth/guards';
import { setPrivateNoStore } from '../../../lib/auth/server';
import { canEditPlaces } from '../../../lib/auth/authorization';
import { loadResearchOpsExportCsv } from '../../../lib/research-ops-server';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  const { identity } = await getStaffContext(request, cookies);
  if (!identity || !canEditPlaces(identity.role)) return new Response('Forbidden', { status: 403 });
  const headers = new Headers({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="uppetite-research-review.csv"',
    'X-Content-Type-Options': 'nosniff',
  });
  setPrivateNoStore(headers);
  return new Response(loadResearchOpsExportCsv(), { headers });
};
