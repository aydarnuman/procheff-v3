import { NextRequest, NextResponse } from 'next/server';
import { scraperHealthMonitor } from '@/lib/market/providers/scraper/health-monitor';

/**
 * Scraper Health Status API
 * GET /api/market/scraper-health
 *
 * Returns health status for all scrapers
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scraperName = searchParams.get('scraper');
    const format = searchParams.get('format') || 'json'; // json | summary

    if (scraperName) {
      // Get specific scraper health
      const health = scraperHealthMonitor.getHealth(scraperName);

      if (!health) {
        return NextResponse.json(
          {
            ok: false,
            error: `Scraper '${scraperName}' not found`
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ok: true,
        scraper: health
      });
    }

    // Get all scrapers health
    const allHealth = scraperHealthMonitor.getAllHealth();
    const systemHealth = scraperHealthMonitor.getSystemHealth();
    const healthyScrapers = scraperHealthMonitor.getHealthyScrapers();

    if (format === 'summary') {
      return NextResponse.json({
        ok: true,
        summary: systemHealth,
        healthyScrapers,
        scrapers: allHealth.map(h => ({
          name: h.scraperName,
          status: h.status,
          successRate: h.successRate,
          averageResponseTime: h.averageResponseTime,
          circuitState: h.circuitState
        }))
      });
    }

    return NextResponse.json({
      ok: true,
      summary: systemHealth,
      healthyScrapers,
      scrapers: allHealth
    });

  } catch (error) {
    console.error('[Scraper Health API] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to fetch scraper health'
      },
      { status: 500 }
    );
  }
}

/**
 * Reset scraper health
 * POST /api/market/scraper-health
 * Body: { scraper?: string, action: "reset" }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scraper, action } = body;

    if (action === 'reset') {
      if (scraper) {
        scraperHealthMonitor.reset(scraper);
        return NextResponse.json({
          ok: true,
          message: `Health data reset for scraper: ${scraper}`
        });
      } else {
        scraperHealthMonitor.resetAll();
        return NextResponse.json({
          ok: true,
          message: 'All health data reset'
        });
      }
    }

    if (action === 'log') {
      // Log health summary to console
      scraperHealthMonitor.logSummary();
      return NextResponse.json({
        ok: true,
        message: 'Health summary logged to console'
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: 'Invalid action. Use "reset" or "log"'
      },
      { status: 400 }
    );

  } catch (error) {
    console.error('[Scraper Health API] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to process request'
      },
      { status: 500 }
    );
  }
}
