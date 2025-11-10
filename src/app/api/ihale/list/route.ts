import { NextRequest } from 'next/server';
import { ihbList } from '@/lib/ihale/client';
import { initTendersTable, upsertTender, getActiveTenders, archiveExpiredTenders } from '@/lib/db/init-tenders';

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
        console.log('🔄 Fetching fresh data from ihalebul.com...');

        // Fetch from worker
        const items = await ihbList(sessionId);

        // Save to database (upsert - insert or update)
        console.log(`💾 Saving ${items.length} tenders to database...`);
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
        console.log(`📦 Archived ${archivedCount} expired tenders`);

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
        console.warn('⚠️ Worker fetch failed, falling back to database:', workerError.message);
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
    console.error('❌ List error:', e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
