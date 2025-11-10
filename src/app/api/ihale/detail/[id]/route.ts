import { NextRequest } from 'next/server';
import { ihbDetail } from '@/lib/ihale/client';
import { getDB } from '@/lib/db/sqlite-client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionId = req.cookies.get('ihale_session')?.value;
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'not_logged_in' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    // Get detail from worker (HTML + documents)
    const detail = await ihbDetail(sessionId, id);

    // Try to get additional info from database
    try {
      const db = getDB();
      const stmt = db.prepare(`
        SELECT
          tender_number as tenderNumber,
          organization,
          city,
          tender_type as tenderType,
          publish_date as publishDate,
          tender_date as tenderDate,
          days_remaining as daysRemaining,
          partial_bid_allowed as partialBidAllowed
        FROM tenders
        WHERE id = ?
      `);
      const dbInfo = stmt.get(id) as any;

      if (dbInfo) {
        // Merge database info with worker detail
        (detail as any).tenderNumber = dbInfo.tenderNumber;
        (detail as any).organization = dbInfo.organization;
        (detail as any).city = dbInfo.city;
        (detail as any).tenderType = dbInfo.tenderType;
        (detail as any).publishDate = dbInfo.publishDate;
        (detail as any).tenderDate = dbInfo.tenderDate;
        (detail as any).daysRemaining = dbInfo.daysRemaining;
        (detail as any).partialBidAllowed = Boolean(dbInfo.partialBidAllowed);
      }
    } catch (dbError) {
      // Database not available, continue with worker data only
      console.warn('Could not fetch from database:', dbError);
    }

    return new Response(JSON.stringify(detail), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
