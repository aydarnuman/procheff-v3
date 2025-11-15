import { AILogger } from '@/lib/ai/logger';
import { archiveExpiredTenders, getActiveTenders, initTenderDB, upsertTender } from '@/lib/db/init-tenders';
import { ihbList } from '@/lib/ihale/client';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Cron job endpoint for automatic tender refresh
 * Called by DigitalOcean scheduled jobs
 * 
 * Schedule examples:
 * - Every hour: "0 * * * *"
 * - Every 6 hours: "0 0,6,12,18 * * *"
 * - Daily at 9 AM: "0 9 * * *"
 * - Every 3 hours: "0 0,3,6,9,12,15,18,21 * * *"
 */
export async function GET(req: NextRequest) {
  // Security: Check for cron secret (optional but recommended)
  const cronSecret = req.nextUrl.searchParams.get('secret');
  const expectedSecret = process.env.IHALE_CRON_SECRET;

  if (expectedSecret && cronSecret !== expectedSecret) {
    AILogger.warn('Unauthorized cron job attempt', { 
      hasSecret: !!cronSecret,
      hasExpected: !!expectedSecret 
    });
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    AILogger.info('🔄 Starting automatic tender refresh (cron job)');

    // Initialize table if not exists
    initTenderDB();

    // Login directly using client function
    const { ihbLogin } = await import('@/lib/ihale/client');
    const sessionId = await ihbLogin();

    if (!sessionId) {
      throw new Error('Login failed - no session ID received');
    }

    AILogger.info('✅ Login successful, fetching tenders...', { sessionId });

    // Fetch from worker
    const items = await ihbList(sessionId);

    // Get existing tender IDs to track new vs updated
    const existingTenders = getActiveTenders();
    const existingIds = new Set(existingTenders.map(t => t.id));
    
    let newCount = 0;
    let updatedCount = 0;
    
    AILogger.info('💾 Saving tenders to database', { 
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
    
    // Archive expired tenders
    const archivedCount = archiveExpiredTenders();
    
    AILogger.info('✅ Tender refresh completed', { 
      new: newCount, 
      updated: updatedCount, 
      total: items.length,
      archived: archivedCount
    });

    return NextResponse.json({
      success: true,
      message: 'Tenders refreshed successfully',
      stats: {
        new: newCount,
        updated: updatedCount,
        total: items.length,
        archived: archivedCount,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    AILogger.error('❌ Tender refresh cron job failed', { 
      error: error.message,
      stack: error.stack 
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

