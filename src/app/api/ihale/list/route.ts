import { NextRequest } from 'next/server';
import { ihbList } from '@/lib/ihale/client';
import { initTendersTable, upsertTender, getActiveTenders, archiveExpiredTenders } from '@/lib/db/init-tenders';
import { AILogger } from '@/lib/ai/logger';

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get('ihale_session')?.value;

  // Check if user wants to refresh from worker or just get from DB
  const refresh = req.nextUrl.searchParams.get('refresh') === 'true';

  try {
    // Initialize table if not exists
    initTendersTable();

    // If refresh requested, fetch from worker
    if (refresh && sessionId) {
      try {
        AILogger.info('Fetching fresh data from ihalebul.com', { sessionId });

        // Fetch from worker
        const items = await ihbList(sessionId);

        // Save to database (upsert - insert or update)
        AILogger.info('Saving tenders to database', { count: items.length });
        for (const item of items) {
          upsertTender({
            id: item.id,
            tenderNumber: item.tenderNumber || item.id,
            title: item.title,
            organization: item.organization,
            city: item.city,
            tenderType: item.tenderType,
            partialBidAllowed: item.partialBidAllowed,
            publishDate: item.publishDate,
            tenderDate: item.tenderDate,
            daysRemaining: item.daysRemaining,
            url: item.url,
          });
        }

        // Archive expired tenders
        const archivedCount = archiveExpiredTenders();
        AILogger.info('Archived expired tenders', { count: archivedCount });

        // Return from database (includes newly added items)
        const tenders = getActiveTenders();
        return new Response(JSON.stringify({
          items: tenders,
          count: tenders.length,
          source: 'worker'
        }), {
          headers: { 'Content-Type': 'application/json' },
        });

      } catch (workerError: any) {
        AILogger.warn('Worker fetch failed, falling back to database', {
          error: workerError.message
        });
        // Continue to database fallback below
      }
    }

    // Return from database (if no refresh or worker failed)
    const tenders = getActiveTenders();

    return new Response(JSON.stringify({
      items: tenders,
      count: tenders.length,
      source: 'database'
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (e: any) {
    AILogger.error('Tender list fetch failed', { error: e.message });
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
