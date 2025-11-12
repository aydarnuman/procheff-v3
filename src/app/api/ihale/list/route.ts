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
        // Get existing tender IDs to track new vs updated
        const existingTenders = getActiveTenders();
        const existingIds = new Set(existingTenders.map(t => t.id));
        
        let newCount = 0;
        let updatedCount = 0;
        
        AILogger.info('Saving tenders to database', { 
          total: items.length, 
          existing: existingIds.size 
        });
        
        for (const item of items) {
          // Extract tenderNumber from title if missing
          let tenderNumber = item.tenderNumber;
          if ((!tenderNumber || tenderNumber === '-') && item.title) {
            // Try multiple patterns: "2025/1845237 - ...", "ILN02328625 - ...", "25DT2004948 - ..."
            const patterns = [
              /^(\d{4}\/\d+)\s*-\s*/,      // 2025/1845237
              /^(ILN\d+)\s*-\s*/i,         // ILN02328625
              /^(\d{2}DT\d+)\s*-\s*/i,     // 25DT2004948
              /^([A-Z]{2,}\d+)\s*-\s*/i    // Other formats
            ];
            
            for (const pattern of patterns) {
              const titleMatch = item.title.match(pattern);
              if (titleMatch) {
                tenderNumber = titleMatch[1];
                break;
              }
            }
          }
          
          const isNew = !existingIds.has(item.id);
          if (isNew) {
            newCount++;
          } else {
            updatedCount++;
          }
          
          upsertTender({
            id: item.id,
            tenderNumber: tenderNumber || item.id,
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
        
        AILogger.info('Tenders saved', { 
          new: newCount, 
          updated: updatedCount, 
          total: items.length 
        });

        // Archive expired tenders
        const archivedCount = archiveExpiredTenders();
        AILogger.info('Archived expired tenders', { count: archivedCount });

        // Return from database (includes newly added items)
        const tenders = getActiveTenders();
        // Add workName from items if available (for fresh data from worker)
        let tendersWithWorkName = tenders;
        if (items && items.length > 0) {
          const itemsMap = new Map(items.map((item: any) => [item.id, item]));
          tendersWithWorkName = tenders.map((tender: any) => {
            const workerItem = itemsMap.get(tender.id) as any;
            return {
              ...tender,
              workName: workerItem?.workName || workerItem?.work_name || tender.title
            };
          });
        }
        return new Response(JSON.stringify({
          items: tendersWithWorkName,
          count: tendersWithWorkName.length,
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
